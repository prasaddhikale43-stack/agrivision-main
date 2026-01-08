
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
// The calculateCarbonCredits flow is no longer called from the backend.
// import { calculateCarbonCredits } from "./calculate-carbon-credits";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

logger.info("Firebase functions initialized.");

// This function now only handles updating totals and creating suggestions
// from data that has already been processed and verified on the client.
export const onNewActivity = onDocumentCreated("activities/{activityId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.log("No data associated with the event");
    return;
  }
  const activity = snapshot.data();
  const activityId = event.params.activityId;
  const userId = activity.userId;

  logger.log(`Approved activity detected for user ${userId}:`, activity);

  // The client now sets the status to "Approved" and calculates credits.
  // The backend's only job is to trust this data and update aggregates.

  if (activity.status !== 'Approved' || !activity.calculatedCredits) {
      logger.warn(`Activity ${activityId} is not approved or has no credits. Skipping aggregation.`);
      return;
  }

  try {
    // 1. Atomically update the user's total credits
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      totalCarbonCredits: FieldValue.increment(activity.calculatedCredits),
    });
    logger.log(`User ${userId} credits incremented by ${activity.calculatedCredits}.`);
    
    // 2. Create a new suggestion document
    const suggestionRef = db.collection("suggestions").doc();
    // Use the climateImpactAnalysis field saved from the client
    const suggestionText = activity.climateImpactAnalysis || "Keep up the great work with your sustainable practices!";
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
