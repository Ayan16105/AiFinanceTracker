import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "J.A.R.V.I.S. | Autonomous Financial Terminal",
  description: "Personal AI Financial Butler — live budget telemetry, automated ledger, debts and savings horizons.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f8f9ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Catch and silence errors from third-party Chrome extensions so they do not crash the Next.js dev overlay
                if (typeof window !== 'undefined') {
                  window.addEventListener('error', function(e) {
                    var fn = e.filename || '';
                    var msg = (e.message || '') + (e.error && e.error.stack ? e.error.stack : '');
                    if (fn.indexOf('chrome-extension://') !== -1 || msg.indexOf('M_ID') !== -1 || msg.indexOf('bis_skin_checked') !== -1) {
                      e.stopImmediatePropagation();
                      e.preventDefault();
                      return true;
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(e) {
                    var r = e.reason || {};
                    var str = (r.message || '') + (r.stack || '');
                    if (str.indexOf('chrome-extension://') !== -1 || str.indexOf('M_ID') !== -1) {
                      e.stopImmediatePropagation();
                      e.preventDefault();
                    }
                  }, true);
                }

                try {
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName && (m.attributeName.indexOf('bis_') === 0 || m.attributeName.indexOf('__processed_') === 0)) {
                        m.target.removeAttribute(m.attributeName);
                      }
                    }
                  });

                  if (document.documentElement) {
                    observer.observe(document.documentElement, {
                      attributes: true,
                      subtree: true
                    });
                  }
                } catch (err) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased flex flex-col" suppressHydrationWarning>
        <div suppressHydrationWarning className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
