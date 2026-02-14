// FoundationDB Documentation - Custom JavaScript

// Hide version selector on landing page immediately
(function() {
  if (document.querySelector('.hero-parallax') ||
      window.location.pathname === '/' ||
      window.location.pathname === '/stable/' ||
      window.location.pathname === '/latest/') {
    var style = document.createElement('style');
    style.textContent = '.md-version { display: none !important; }';
    document.head.appendChild(style);
  }
})();

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

// ==========================================================================
// Mermaid Fullscreen Viewer
// Provides fullscreen overlay with zoom and pan for Mermaid diagrams
// ==========================================================================

(function() {
  'use strict';

  // Zoom limits
  var MIN_ZOOM = 0.5;
  var MAX_ZOOM = 5;
  var ZOOM_STEP = 0.25;

  // State for the overlay
  var state = {
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    startX: 0,
    startY: 0,
    lastPanX: 0,
    lastPanY: 0
  };

  // Track cleanup functions for event listeners
  var cleanupFns = [];

  // Create the overlay element (once)
  var overlay = null;
  var svgContainer = null;
  var zoomIndicator = null;
  var closeBtn = null;
  var previousFocus = null;

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'mermaid-fullscreen-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Fullscreen diagram viewer');
    overlay.innerHTML = [
      '<div class="mermaid-fullscreen-backdrop"></div>',
      '<div class="mermaid-fullscreen-content">',
      '  <div class="mermaid-fullscreen-toolbar">',
      '    <button class="mermaid-zoom-btn" data-action="zoom-out" aria-label="Zoom out">−</button>',
      '    <span class="mermaid-zoom-indicator">100%</span>',
      '    <button class="mermaid-zoom-btn" data-action="zoom-in" aria-label="Zoom in">+</button>',
      '    <button class="mermaid-zoom-btn" data-action="zoom-reset" aria-label="Reset zoom">⟲</button>',
      '    <button class="mermaid-close-btn" aria-label="Close fullscreen view">✕</button>',
      '  </div>',
      '  <div class="mermaid-fullscreen-svg-container"></div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(overlay);

    svgContainer = overlay.querySelector('.mermaid-fullscreen-svg-container');
    zoomIndicator = overlay.querySelector('.mermaid-zoom-indicator');
    closeBtn = overlay.querySelector('.mermaid-close-btn');

    // Event listeners for toolbar buttons
    overlay.querySelector('[data-action="zoom-in"]').addEventListener('click', function() {
      zoomBy(ZOOM_STEP);
    });
    overlay.querySelector('[data-action="zoom-out"]').addEventListener('click', function() {
      zoomBy(-ZOOM_STEP);
    });
    overlay.querySelector('[data-action="zoom-reset"]').addEventListener('click', resetZoom);
    closeBtn.addEventListener('click', closeOverlay);

    // Close on backdrop click
    overlay.querySelector('.mermaid-fullscreen-backdrop').addEventListener('click', closeOverlay);
  }

  function resetState() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.isPanning = false;
    state.startX = 0;
    state.startY = 0;
    state.lastPanX = 0;
    state.lastPanY = 0;
  }

  function updateTransform() {
    var svg = svgContainer.querySelector('svg');
    if (svg) {
      svg.style.transform = 'translate(' + state.panX + 'px, ' + state.panY + 'px) scale(' + state.zoom + ')';
    }
    zoomIndicator.textContent = Math.round(state.zoom * 100) + '%';
  }

  function zoomBy(delta) {
    state.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom + delta));
    updateTransform();
  }

  function zoomTo(newZoom, centerX, centerY) {
    // Zoom toward the given point
    var rect = svgContainer.getBoundingClientRect();
    var relX = centerX - rect.left - rect.width / 2;
    var relY = centerY - rect.top - rect.height / 2;

    var oldZoom = state.zoom;
    state.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));

    var zoomRatio = state.zoom / oldZoom;
    state.panX = relX - (relX - state.panX) * zoomRatio;
    state.panY = relY - (relY - state.panY) * zoomRatio;

    updateTransform();
  }

  function resetZoom() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    updateTransform();
  }

  function openOverlay(mermaidEl) {
    createOverlay();
    resetState();

    // Clone the SVG
    var svg = mermaidEl.querySelector('svg');
    if (!svg) return;

    var clonedSvg = svg.cloneNode(true);
    clonedSvg.style.maxWidth = '90vw';
    clonedSvg.style.maxHeight = '80vh';
    clonedSvg.style.width = 'auto';
    clonedSvg.style.height = 'auto';
    clonedSvg.style.transformOrigin = 'center center';
    clonedSvg.style.cursor = 'grab';

    svgContainer.innerHTML = '';
    svgContainer.appendChild(clonedSvg);

    // Store previous focus for restoration
    previousFocus = document.activeElement;

    // Show overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    updateTransform();

    // Focus the close button for accessibility
    closeBtn.focus();

    // Attach event listeners
    attachOverlayListeners();
  }

  function closeOverlay() {
    if (!overlay) return;

    overlay.classList.remove('active');
    document.body.style.overflow = '';

    // Clean up event listeners
    cleanupFns.forEach(function(fn) { fn(); });
    cleanupFns = [];

    // Restore focus
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
  }

  function attachOverlayListeners() {
    var svg = svgContainer.querySelector('svg');

    // Keyboard - Escape to close
    function handleKeydown(e) {
      if (e.key === 'Escape') {
        closeOverlay();
      }
    }
    document.addEventListener('keydown', handleKeydown);
    cleanupFns.push(function() {
      document.removeEventListener('keydown', handleKeydown);
    });

    // Mouse wheel zoom
    function handleWheel(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      zoomTo(state.zoom + delta, e.clientX, e.clientY);
    }
    svgContainer.addEventListener('wheel', handleWheel, { passive: false });
    cleanupFns.push(function() {
      svgContainer.removeEventListener('wheel', handleWheel);
    });

    // Pan with mouse drag
    function handleMouseDown(e) {
      if (e.button !== 0) return; // Left click only
      state.isPanning = true;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.lastPanX = state.panX;
      state.lastPanY = state.panY;
      svg.style.cursor = 'grabbing';
    }
    function handleMouseMove(e) {
      if (!state.isPanning) return;
      var dx = e.clientX - state.startX;
      var dy = e.clientY - state.startY;
      state.panX = state.lastPanX + dx;
      state.panY = state.lastPanY + dy;
      updateTransform();
    }
    function handleMouseUp() {
      state.isPanning = false;
      if (svg) svg.style.cursor = 'grab';
    }

    svgContainer.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    cleanupFns.push(function() {
      svgContainer.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    });

    // Touch support for pinch zoom and pan
    var lastTouchDist = 0;
    var lastTouchCenter = { x: 0, y: 0 };

    function getTouchDistance(touches) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function getTouchCenter(touches) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    }

    function handleTouchStart(e) {
      if (e.touches.length === 1) {
        state.isPanning = true;
        state.startX = e.touches[0].clientX;
        state.startY = e.touches[0].clientY;
        state.lastPanX = state.panX;
        state.lastPanY = state.panY;
      } else if (e.touches.length === 2) {
        state.isPanning = false;
        lastTouchDist = getTouchDistance(e.touches);
        lastTouchCenter = getTouchCenter(e.touches);
      }
    }
    function handleTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 1 && state.isPanning) {
        var dx = e.touches[0].clientX - state.startX;
        var dy = e.touches[0].clientY - state.startY;
        state.panX = state.lastPanX + dx;
        state.panY = state.lastPanY + dy;
        updateTransform();
      } else if (e.touches.length === 2) {
        var newDist = getTouchDistance(e.touches);
        var center = getTouchCenter(e.touches);
        var scale = newDist / lastTouchDist;
        zoomTo(state.zoom * scale, center.x, center.y);
        lastTouchDist = newDist;
        lastTouchCenter = center;
      }
    }
    function handleTouchEnd() {
      state.isPanning = false;
    }

    svgContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    svgContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    svgContainer.addEventListener('touchend', handleTouchEnd);
    cleanupFns.push(function() {
      svgContainer.removeEventListener('touchstart', handleTouchStart);
      svgContainer.removeEventListener('touchmove', handleTouchMove);
      svgContainer.removeEventListener('touchend', handleTouchEnd);
    });
  }

  function addExpandButtons() {
    // Find all mermaid containers that have been rendered (contain SVG)
    var mermaidContainers = document.querySelectorAll('pre.mermaid');

    mermaidContainers.forEach(function(container) {
      // Skip if already processed or no SVG yet
      if (container.querySelector('.mermaid-expand-btn')) return;
      if (!container.querySelector('svg')) return;

      // Create expand button
      var btn = document.createElement('button');
      btn.className = 'mermaid-expand-btn';
      btn.setAttribute('aria-label', 'View diagram in fullscreen');
      btn.setAttribute('title', 'View fullscreen');
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';

      // Make container position relative for button positioning
      container.style.position = 'relative';

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openOverlay(container);
      });

      container.appendChild(btn);
    });
  }

  function initMermaidFullscreen() {
    // Use MutationObserver to detect when mermaid finishes rendering
    // Mermaid transforms <pre class="mermaid"><code>...</code></pre> into <pre class="mermaid"><svg>...</svg></pre>
    var observer = new MutationObserver(function(mutations) {
      var shouldAddButtons = false;
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeName === 'SVG' || (node.querySelector && node.querySelector('svg'))) {
              shouldAddButtons = true;
            }
          });
        }
      });
      if (shouldAddButtons) {
        // Small delay to ensure mermaid is fully done
        setTimeout(addExpandButtons, 100);
      }
    });

    // Observe the content area for changes
    var contentArea = document.querySelector('.md-content');
    if (contentArea) {
      observer.observe(contentArea, { childList: true, subtree: true });
    }

    // Also try immediately in case diagrams are already rendered
    addExpandButtons();
    // And with a small delay as fallback
    setTimeout(addExpandButtons, 500);
    setTimeout(addExpandButtons, 1000);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMermaidFullscreen);
  } else {
    initMermaidFullscreen();
  }

  // Re-initialize on SPA navigation (MkDocs Material instant loading)
  if (typeof document$ !== 'undefined') {
    document$.subscribe(function() {
      // Delay to let mermaid render
      setTimeout(addExpandButtons, 300);
      setTimeout(addExpandButtons, 600);
      setTimeout(addExpandButtons, 1000);
    });
  }
})();
