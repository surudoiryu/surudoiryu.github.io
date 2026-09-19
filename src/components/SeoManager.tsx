import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type SeoConfig = {
    title: string;
    description: string;
    image?: string;
    noindex?: boolean;
    schemaType?: "WebPage" | "CollectionPage" | "Article";
    faq?: Array<{ question: string; answer: string }>;
};

const ORGANIZATION_SCHEMA = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WeedInfo",
    url: "https://weedinfo.nl",
    logo: "https://weedinfo.nl/android-chrome-512x512.png",
};

const WEBSITE_SCHEMA = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WeedInfo",
    url: "https://weedinfo.nl",
    inLanguage: "nl-NL",
};

const HOME_FAQ: Array<{ question: string; answer: string }> = [
    {
        question: "Wat is WeedInfo?",
        answer:
            "WeedInfo is een Nederlandstalig platform met informatie over cannabisproducten, telers en coffeeshops, inclusief ervaringen en reviews van gebruikers.",
    },
    {
        question: "Kun je WeedInfo ook offline gebruiken?",
        answer:
            "Ja. Eerder geladen gegevens blijven beschikbaar via de PWA-cache, zodat je productinformatie ook zonder internetverbinding kunt bekijken.",
    },
    {
        question: "Kan ik reviews plaatsen zonder account?",
        answer:
            "Nee. Reviews en likes kun je alleen toevoegen als je ingelogd bent en online bent, zodat gegevens veilig aan je profiel gekoppeld blijven.",
    },
];

function resolveSeo(pathname: string): SeoConfig {
    if (pathname === "/") {
        return {
            title: "WeedInfo | Cannabis soorten, telers en coffeeshops",
            description:
                "Ontdek cannabis soorten, telers en coffeeshops op WeedInfo met duidelijke uitleg over effecten, gebruikersreviews en praktische productinformatie, zodat je sneller een passende keuze maakt.",
            schemaType: "WebPage",
            faq: HOME_FAQ,
        };
    }

    if (pathname.startsWith("/cannabis/")) {
        return {
            title: "Cannabis Product | WeedInfo",
            description:
                "Bekijk een cannabisproduct met uitgebreide details over smaakprofiel, effecten, beoordelingen en ervaringen van andere gebruikers, inclusief handige deelopties en actuele productinformatie.",
            image: "/android-chrome-512x512.png",
            schemaType: "WebPage",
        };
    }

    if (pathname.startsWith("/cannabis")) {
        return {
            title: "Alle Cannabis | WeedInfo",
            description:
                "Doorzoek alle cannabisproducten met filters op type, teler, reviews en kenmerken. Vergelijk soorten overzichtelijk en vind snel de producten die passen bij jouw voorkeuren en ervaring.",
            image: "/android-chrome-512x512.png",
            schemaType: "CollectionPage",
        };
    }

    if (pathname.startsWith("/keuzehulp")) {
        return {
            title: "Keuzehulp Cannabis | WeedInfo",
            description:
                "Doorloop de korte keuzehulp van WeedInfo en krijg direct een gefilterd productoverzicht op basis van ervaring, voorkeuren voor type, smaak en effecten.",
            image: "/android-chrome-512x512.png",
            schemaType: "WebPage",
        };
    }

    if (pathname.startsWith("/telers/")) {
        return {
            title: "Teler Profiel | WeedInfo",
            description:
                "Bekijk telerprofielen met productaanbod, reviews en achtergrondinformatie. Zo krijg je snel inzicht in herkomst, stijl en populariteit van telers binnen de actuele catalogus.",
            image: "/android-chrome-512x512.png",
            schemaType: "WebPage",
        };
    }

    if (pathname.startsWith("/telers")) {
        return {
            title: "Alle Telers | WeedInfo",
            description:
                "Ontdek alle telers op WeedInfo in een overzichtelijke lijst met gekoppelde producten, beoordelingen en relevante details, zodat je telers eenvoudig kunt vergelijken en volgen.",
            image: "/android-chrome-512x512.png",
            schemaType: "CollectionPage",
        };
    }

    if (pathname.startsWith("/kaart")) {
        return {
            title: "Alle Winkels | WeedInfo",
            description:
                "Bekijk alle coffeeshops op de kaart, vergelijk openingstijden, voorzieningen en productinformatie en vind eenvoudig een winkel in de buurt voor een beter voorbereid bezoek.",
            image: "/android-chrome-512x512.png",
            schemaType: "CollectionPage",
        };
    }

    if (pathname.startsWith("/cannabis-winkel")) {
        return {
            title: "Coffeeshop Profiel | WeedInfo",
            description:
                "Bekijk een coffeeshopprofiel met openingstijden, beschikbare producten, gekoppelde telers en reviews, zodat je winkels beter kunt vergelijken en gerichter kunt kiezen.",
            image: "/android-chrome-512x512.png",
            schemaType: "WebPage",
        };
    }

    if (pathname.startsWith("/info") || pathname.startsWith("/blog") || pathname.startsWith("/zoeken")) {
        return {
            title: "Cannabis Info | WeedInfo",
            description:
                "Lees duidelijke artikelen over verantwoord gebruik, geschiedenis en inhoudelijke plantkennis. De info-sectie helpt je met begrijpelijke uitleg en praktische inzichten.",
            image: "/android-chrome-512x512.png",
            schemaType: "Article",
        };
    }

    if (pathname.startsWith("/voorwaarden")) {
        return {
            title: "Algemene Voorwaarden | WeedInfo",
            description:
                "Lees de algemene voorwaarden van WeedInfo met belangrijke afspraken over platformgebruik, verantwoordelijkheden en rechten, zodat je weet welke regels gelden bij gebruik van de dienst.",
            schemaType: "WebPage",
        };
    }

    if (pathname.startsWith("/privacy")) {
        return {
            title: "Privacyverklaring | WeedInfo",
            description:
                "Bekijk hoe WeedInfo omgaat met persoonsgegevens, accountgegevens en gebruikerscontent. De privacyverklaring legt helder uit welke data wordt verwerkt en waarvoor deze wordt gebruikt.",
            schemaType: "WebPage",
        };
    }

    if (pathname.startsWith("/cookies")) {
        return {
            title: "Cookiebeleid | WeedInfo",
            description:
                "Lees welke cookies en lokale opslag WeedInfo gebruikt voor functionaliteit, prestaties en statistieken. Je ziet ook hoe je voorkeuren kunt beheren via je browserinstellingen.",
            schemaType: "WebPage",
        };
    }

    if (pathname.startsWith("/disclaimer")) {
        return {
            title: "Disclaimer | WeedInfo",
            description:
                "Bekijk de disclaimer van WeedInfo met uitleg over informatiegebruik, aansprakelijkheid en beperkingen. Zo is duidelijk hoe je de informatie op het platform verantwoord gebruikt.",
            schemaType: "WebPage",
        };
    }

    if (pathname.startsWith("/login") || pathname.startsWith("/aanmelden") || pathname.startsWith("/profiel")) {
        return {
            title: "Account | WeedInfo",
            description:
                "Log in op WeedInfo of beheer je persoonlijke profiel met likes, reviews en instellingen. Accountpagina's zijn beschermd en bedoeld voor geregistreerde gebruikers van het platform.",
            image: "/android-chrome-512x512.png",
            noindex: true,
            schemaType: "WebPage",
        };
    }

    return {
        title: "WeedInfo",
        description:
            "WeedInfo biedt betrouwbare, Nederlandstalige informatie over cannabisproducten, telers en coffeeshops met reviews, filters en handige tools voor een betere gebruikerservaring.",
        schemaType: "WebPage",
    };
}

function upsertMeta(name: string, content: string) {
    let element = document.querySelector(`meta[name="${name}"]`);
    if (!element) {
        element = document.createElement("meta");
        element.setAttribute("name", name);
        document.head.appendChild(element);
    }
    element.setAttribute("content", content);
}

function upsertPropertyMeta(property: string, content: string) {
    let element = document.querySelector(`meta[property="${property}"]`);
    if (!element) {
        element = document.createElement("meta");
        element.setAttribute("property", property);
        document.head.appendChild(element);
    }
    element.setAttribute("content", content);
}

function upsertCanonical(url: string) {
    let element = document.querySelector('link[rel="canonical"]');
    if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", "canonical");
        document.head.appendChild(element);
    }
    element.setAttribute("href", url);
}

function upsertJsonLd(id: string, schema: object) {
    let element = document.getElementById(id) as HTMLScriptElement | null;
    if (!element) {
        element = document.createElement("script");
        element.id = id;
        element.type = "application/ld+json";
        document.head.appendChild(element);
    }
    element.text = JSON.stringify(schema);
}

function removeJsonLd(id: string) {
    const element = document.getElementById(id);
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

export default function SeoManager() {
    const location = useLocation();

    useEffect(() => {
        const config = resolveSeo(location.pathname);
        const canonical = `${window.location.origin}${location.pathname}`;
        const imageUrl = config.image
            ? `${window.location.origin}${config.image}`
            : `${window.location.origin}/android-chrome-512x512.png`;

        document.title = config.title;
        document.documentElement.lang = "nl";

        upsertMeta("description", config.description);
        upsertMeta("keywords", "cannabis, soorten, telers, coffeeshops, reviews, weedinfo");
        upsertMeta("robots", config.noindex ? "noindex,nofollow" : "index,follow");
        upsertMeta("twitter:card", "summary_large_image");
        upsertMeta("twitter:title", config.title);
        upsertMeta("twitter:description", config.description);
        upsertMeta("twitter:image", imageUrl);
        upsertPropertyMeta("og:title", config.title);
        upsertPropertyMeta("og:description", config.description);
        upsertPropertyMeta("og:type", config.schemaType === "Article" ? "article" : "website");
        upsertPropertyMeta("og:url", canonical);
        upsertPropertyMeta("og:site_name", "WeedInfo");
        upsertPropertyMeta("og:locale", "nl_NL");
        upsertPropertyMeta("og:image", imageUrl);
        upsertCanonical(canonical);

        upsertJsonLd("jsonld-organization", ORGANIZATION_SCHEMA);
        upsertJsonLd("jsonld-website", WEBSITE_SCHEMA);
        upsertJsonLd("jsonld-webpage", {
            "@context": "https://schema.org",
            "@type": config.schemaType ?? "WebPage",
            name: config.title,
            description: config.description,
            url: canonical,
            inLanguage: "nl-NL",
        });

        if (config.faq?.length) {
            upsertJsonLd("jsonld-faq", {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: config.faq.map((item) => ({
                    "@type": "Question",
                    name: item.question,
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: item.answer,
                    },
                })),
            });
        } else {
            removeJsonLd("jsonld-faq");
        }
    }, [location.pathname]);

    return null;
}
