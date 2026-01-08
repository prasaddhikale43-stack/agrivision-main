
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { calculateCarbonCredits } from "./calculate-carbon-credits";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

logger.info("Firebase functions initialized.");

// This function triggers when a new activity is created.
export const onNewActivity = onDocumentCreated("activities/{activityId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.log("No data associated with the event");
    return;
  }
  const activity = snapshot.data();
  const activityId = event.params.activityId;
  const userId = activity.userId;

  logger.log(`New activity detected for user ${userId}:`, activity);

  let analysisResult;
  try {
    // 1. Call Gemini to analyze the activity
    analysisResult = await calculateCarbonCredits({
        ...activity,
        userId,
        // The flow expects these as data URIs, but the function receives them from the client
        // after they've been uploaded. For now, we'll pass empty strings if they don't exist.
        activityPhotoUrl: activity.photoUrls?.[0] || '',
        cropPhotoUrl: activity.photoUrls?.[1] || '',
        pesticidePhotoUrl: activity.photoUrls?.[2] || '',
    });

    // 2. Update the activity document with Gemini's results
    await snapshot.ref.update({
      calculatedCredits: analysisResult.estimatedCO2SavedKg,
      status: "Approved", // Always set status to Approved
      advice: analysisResult.reductionAdvice,
    });
    logger.log(`Activity ${activityId} updated with AI analysis and approved.`);

  } catch (error) {
    logger.error(`Error during AI analysis for activity ${activityId}:`, error);
    // If AI fails, approve with default values to ensure credits are still awarded.
    analysisResult = {
        estimatedCO2SavedKg: 1.5, // Default credit value
        reductionAdvice: "AI analysis could not be completed, but your activity has been approved. Keep up the great work!",
        climateImpactAnalysis: `Your activity '${activity.activityType}' contributes positively to the environment.`,
    };
    await snapshot.ref.update({ 
        status: 'Approved', 
        advice: analysisResult.reductionAdvice,
        calculatedCredits: analysisResult.estimatedCO2SavedKg,
    });
     logger.log(`Activity ${activityId} approved with default values after AI failure.`);
  }

  try {
    // 3. Atomically update the user's total credits
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      totalCarbonCredits: FieldValue.increment(analysisResult.estimatedCO2SavedKg),
    });
    logger.log(`User ${userId} credits incremented by ${analysisResult.estimatedCO2SavedKg}.`);
    
    // 4. Create a new suggestion document
    const suggestionRef = db.collection("suggestions").doc();
    // Use a default message if climateImpactAnalysis is not available
    const suggestionText = analysisResult.climateImpactAnalysis;
    await suggestionRef.set({
        userId: userId,
        relatedActivityId: activityId,
        suggestionText: suggestionText,
        createdAt: FieldValue.serverTimestamp(),
        isRead: false
    });
    logger.log(`Suggestion created for activity ${activityId}.`);

  } catch (error) {
    logger.error(`Error updating user credits or creating suggestion for activity ${activityId}:`, error);
  }
});


// This scheduled function runs every hour to update user ranks.
export const updateleaderboardranks = onSchedule("every 60 minutes", async (event) => {
    logger.log("Running scheduled job to update leaderboard ranks.");

    const usersSnapshot = await db.collection('users').orderBy('totalCarbonCredits', 'desc').get();

    if (usersSnapshot.empty) {
        logger.log("No users to rank.");
        return;
    }

    const batch = db.batch();
    let rank = 1;

    usersSnapshot.forEach(doc => {
        const userRef = db.collection('users').doc(doc.id);
        batch.update(userRef, { rank: rank++ });
    });

    await batch.commit();
    logger.log(`Leaderboard ranks updated for ${usersSnapshot.size} users.`);
});
