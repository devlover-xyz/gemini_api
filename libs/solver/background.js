/**
 * reCAPTCHA Auto Solver - Background Script
 * Handles extension lifecycle and coordination
 */

console.log('reCAPTCHA Solver background script loaded');

// Extension state
const state = {
  enabled: true,
  autoSolve: true,
  solveCount: 0,
  lastSolved: null
};

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'solved') {
    state.solveCount++;
    state.lastSolved = new Date().toISOString();
    console.log('reCAPTCHA solved!', { count: state.solveCount });
  }

  if (message.type === 'getState') {
    sendResponse(state);
  }
});

/**
 * Handle extension icon click (if needed)
 */
chrome.action?.onClicked.addListener((tab) => {
  // Send message to content script to solve
  chrome.tabs.sendMessage(tab.id, { action: 'solve' }, (response) => {
    if (response?.success) {
      console.log('Manual solve triggered successfully');
    }
  });
});
