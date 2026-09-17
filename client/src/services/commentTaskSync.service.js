// src/services/commentTaskSync.service.ts
import researchTaskService from './researchTask.service';

/**
 * Service to sync ONLYOFFICE native comments to the CoreResearch Task system.
 */

// We maintain a debounce map so rapid typing on a comment doesn't spam Firebase.
const syncTimeouts = new Map();

/**
 * Handle a new or modified comment.
 * 
 * @param {Object} workspace - The current workspace context.
 * @param {Object} userProfile - The current user's profile.
 * @param {Object} commentData - Data returned by ONLYOFFICE connector (contains Id, Text, Author, Solved, etc.)
 * @param {Array} existingTasks - Current list of tasks for the workspace.
 */
export const syncCommentToTask = (workspace, userProfile, commentData, existingTasks = []) => {
  console.log('[CommentTaskSync] Attempting to sync comment:', commentData?.Id, 'Workspace exists:', !!workspace);
  if (!workspace || !commentData || !commentData.Id) return;

  const commentId = commentData.Id;
  const isResolved = commentData.Solved === true;
  console.log(`[CommentTaskSync] Syncing comment ${commentId}. Resolved: ${isResolved}`);

  // Debounce rapid syncs
  if (syncTimeouts.has(commentId)) {
    clearTimeout(syncTimeouts.get(commentId));
  }

  syncTimeouts.set(
    commentId,
    setTimeout(async () => {
      try {
        const existingTask = existingTasks.find(
          (t) => t.source === 'native_comment' && t.anchor?.commentId === commentId
        );

        // Parse comments/replies
        const textToUse = commentData.Text || 'Review this section.';

        if (existingTask) {
          // Task exists. Check if we need to update it.
          let statusToSet = existingTask.status;

          // If native comment is resolved, mark task as completed
          if (isResolved && existingTask.status !== 'completed') {
            await researchTaskService.reviewTask(
              existingTask.id,
              'completed',
              'Resolved via native document comment',
              userProfile?.fullName || 'System'
            );
          } else if (!isResolved && existingTask.status === 'completed') {
            // Re-opened comment
            await researchTaskService.updateTaskStatus(
              existingTask.id,
              'todo',
              'Re-opened via native document comment',
              userProfile?.fullName || 'System'
            );
          }

          // In a more complex setup, we could parse the Replies array 
          // and push them into the task's submissionNotes or revisionHistory.

        } else {
          // Task does not exist, create it
          if (isResolved) return; // Don't create a task for a comment that's already resolved

          console.log(`[CommentTaskSync] Creating new task for comment ${commentId}`);
          
          const d = new Date();
          d.setDate(d.getDate() + 7); // Default due date 1 week from now

          await researchTaskService.createTask({
            workspaceId: workspace.id,
            proposalId: workspace.proposalId,
            projectId: workspace.projectId,
            documentId: workspace.documentId,
            studentId: workspace.studentId,
            studentName: workspace.studentName,
            adviserId: workspace.adviserId || userProfile?.uid,
            adviserName: commentData.Author || workspace.adviserName || userProfile?.fullName,
            title: 'Review Document Comment',
            description: textToUse,
            type: 'anchored',
            source: 'native_comment',
            anchor: {
              selectedText: commentData.QuoteText || 'See document comment...',
              commentId: commentId,
            },
            priority: 'medium',
            dueDate: d.toISOString().split('T')[0],
          });
        }
      } catch (err) {
        console.error('[CommentTaskSync] Failed to sync comment to task:', err);
      } finally {
        syncTimeouts.delete(commentId);
      }
    }, 1000) // 1 second debounce
  );
};

/**
 * Handle a removed comment.
 */
export const handleCommentRemoved = async (workspace, commentData, existingTasks = []) => {
  if (!workspace || !commentData || !commentData.Id) return;
  const commentId = commentData.Id;

  const existingTask = existingTasks.find(
    (t) => t.source === 'native_comment' && t.anchor?.commentId === commentId
  );

  if (existingTask) {
    try {
      // Rather than deleting entirely, we can mark it completed with a note
      await researchTaskService.reviewTask(
        existingTask.id,
        'completed',
        'Comment removed from document.',
        'System'
      );
    } catch (err) {
      console.error('[CommentTaskSync] Failed to handle removed comment:', err);
    }
  }
};

/**
 * Perform a full sync on document load.
 */
export const syncAllComments = (workspace, userProfile, commentsArray, existingTasks = []) => {
  if (!workspace || !Array.isArray(commentsArray)) return;
  
  commentsArray.forEach((commentData) => {
    syncCommentToTask(workspace, userProfile, commentData, existingTasks);
  });
};

export default {
  syncCommentToTask,
  handleCommentRemoved,
  syncAllComments,
};
