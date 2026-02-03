// FoundationDB Documentation - Custom JavaScript

// Feedback widget - Send feedback events to Google Analytics 4
// This integrates with MkDocs Material's built-in feedback feature
var defined = (function () {
  var defined = {};

  // Feedback event handler for GA4
  defined.feedback = function () {
    var feedback = document.forms.feedback;
    if (feedback) {
      feedback.hidden = false;
      feedback.addEventListener("submit", function (ev) {
        ev.preventDefault();

        // Get the selected rating value
        var data = ev.submitter.getAttribute("data-md-value");
        var page = {
          title: document.title,
          url: window.location.href,
          path: window.location.pathname
        };

        // Send event to Google Analytics 4
        if (typeof gtag === "function") {
          gtag("event", "feedback", {
            event_category: "documentation",
            event_label: page.path,
            value: parseInt(data),
            page_title: page.title,
            page_location: page.url
          });
          console.log("[Feedback] Sent to GA4:", page.path, "rating:", data);
        } else {
          // Fallback: log to console if gtag is not available
          console.log("[Feedback] Event (gtag not available):", {
            page: page.path,
            rating: data,
            title: page.title
          });
        }

        // Hide the feedback form and show the response note
        feedback.firstElementChild.disabled = true;
        var note = feedback.querySelector(
          ".md-feedback__note [data-md-value='" + data + "']"
        );
        if (note) {
          note.hidden = false;
        }
      });
    }
  };

  return defined;
})();

// Initialize feedback handler when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  defined.feedback();
});

// Re-initialize on navigation (for MkDocs Material's instant loading)
if (typeof document$ !== "undefined") {
  document$.subscribe(function () {
    defined.feedback();
  });
}

