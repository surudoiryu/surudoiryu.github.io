import { useEffect } from "react";

const GTM_SCRIPT_ID = "gtm-bootstrap-script";

export default function GtmManager() {
    useEffect(() => {
        const gtmId = process.env.REACT_APP_GTM_ID?.trim();
        const analyticsConsent = window.localStorage.getItem("weedinfoAnalyticsConsent");
        if (!gtmId || analyticsConsent !== "accepted") {
            return;
        }

        if (document.getElementById(GTM_SCRIPT_ID)) {
            return;
        }

        const script = document.createElement("script");
        script.id = GTM_SCRIPT_ID;
        script.innerHTML = `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
        `;

        document.head.appendChild(script);
    }, []);

    return null;
}
