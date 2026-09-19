import { Box, Button, Card, CardContent, CardMedia, Chip, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";

type InfoTopic = {
    slug: string;
    title: string;
    summary: string;
    image: string;
    secondaryImage: string;
    readTime: string;
    tags: string[];
    paragraphs: string[];
    externalLinks: Array<{ label: string; href: string }>;
};

type SectionBlock = {
    heading: string;
    paragraphs: string[];
};

const infoTopics: InfoTopic[] = [
    {
        slug: "verantwoord-gebruik-basis",
        title: "Verantwoord gebruik: een praktische basis",
        summary: "Hoe je als volwassene bewust omgaat met cannabis: rustig opbouwen, timing kiezen en je eigen grenzen respecteren.",
        image: "/images/pexels-kindelmedia-7667903.jpg",
        secondaryImage: "/images/pexels-kindelmedia-7667928.jpg",
        readTime: "8 min",
        tags: ["Verantwoord", "Beginner", "Veiligheid"],
        paragraphs: [
            "Verantwoord gebruik begint meestal met het kiezen van een rustig moment zonder tijdsdruk. Als je gehaast bent of veel prikkels hebt, wordt doseren lastiger.",
            "Een lage startdosering is vaak de meest betrouwbare aanpak, zeker wanneer je gevoelig reageert of een nieuw product probeert. Je kunt later altijd nog bijsturen.",
            "Bij inhalatie merk je effect meestal sneller dan bij edibles. Bij eetbare producten kan het langer duren voordat je een duidelijk beeld hebt van de sterkte.",
            "Hydratatie en een lichte maaltijd vooraf maken het voor veel gebruikers comfortabeler. Kleine praktische zaken hebben vaak veel invloed op de ervaring.",
            "Gebruik liever niet wanneer je nog moet rijden of taken uitvoert die concentratie en reactievermogen vragen. Veiligheid gaat altijd voor gemak.",
            "Cannabis reageert anders per persoon. Leeftijd, slaap, stress en tolerantie kunnen allemaal bepalen hoe intens een effect binnenkomt.",
            "Houd bij wat je gebruikt en hoe je je voelt. Een korte notitie van type, hoeveelheid en timing helpt je om patronen beter te begrijpen.",
            "Als je merkt dat het te sterk wordt, kies dan rust, frisse lucht en water. Vaak zakt de intensiteit vanzelf als je geen extra prikkels toevoegt.",
            "Combinatiegebruik met alcohol of andere middelen vergroot de kans op een onprettige ervaring. Voor duidelijkheid in effect is enkelvoudig gebruik meestal beter.",
            "Respecteer je eigen grens en die van je omgeving. Verantwoord gebruik betekent ook dat je stopt wanneer het niet goed voelt.",
            "Informatie uit reviews kan helpen, maar vervangt geen eigen observatie. Gebruik community-ervaringen als referentie, niet als absolute waarheid.",
            "Wie structureel gebruikt, doet er goed aan regelmatig een pauze in te plannen. Daarmee houd je tolerantie en routine beter in balans.",
        ],
        externalLinks: [
            { label: "Trimbos Instituut - Drugs info", href: "https://www.trimbos.nl/kennis/drugs/" },
            { label: "Jellinek - Cannabis", href: "https://www.jellinek.nl/informatie-over-alcohol-drugs/drugs/cannabis/" },
            { label: "Rijksoverheid - Cannabisbeleid", href: "https://www.rijksoverheid.nl/onderwerpen/drugs" },
        ],
    },
    {
        slug: "geschiedenis-van-cannabis",
        title: "De geschiedenis van cannabis in vogelvlucht",
        summary: "Van traditionele toepassingen tot modern beleid: een korte en heldere tijdlijn van de cannabisplant.",
        image: "/images/pexels-elsa-olofsson-3357043-18512074.jpg",
        secondaryImage: "/images/pexels-elsa-olofsson-3357043-6321769.jpg",
        readTime: "9 min",
        tags: ["Historie", "Cultuur", "Achtergrond"],
        paragraphs: [
            "Cannabis kent een lange geschiedenis als veelzijdige plant. In verschillende regio’s werd de plant gebruikt voor vezels, olie, rituelen en traditionele toepassingen.",
            "Door die brede inzet had cannabis eeuwenlang een praktische rol in samenlevingen. Niet elk gebruik was psychoactief; vaak ging het om landbouw of textiel.",
            "In de 19e en 20e eeuw veranderde het publieke en juridische beeld snel. Wetgeving werd strenger en het debat verschoof van nut naar risico.",
            "Die internationale beleidsverschuiving zorgde voor decennia van stigma. Onderzoek en open kennisdeling kwamen daardoor op veel plekken onder druk te staan.",
            "In Nederland ontstond later een eigen benadering waarin scheiding van markten en pragmatische controle centraal kwamen te staan. Dat model evolueerde door de jaren heen.",
            "Tegelijk bleef de internationale context sterk meespelen, vooral in handel en toezicht. Lokale keuzes stonden zelden los van wereldwijde ontwikkelingen.",
            "Vanaf de jaren 2000 groeide opnieuw aandacht voor kwaliteitscontrole, consumenteninformatie en producttransparantie. Dat zie je nu terug in labels, analyses en data.",
            "Ook publieke opinie veranderde: van zwart-wit discussie naar meer nuance over risico, dosering en context. Er is meer ruimte gekomen voor praktische voorlichting.",
            "Moderne platforms helpen gebruikers om informatie te vergelijken op effecten, samenstelling en ervaringen. Hierdoor verschuift de focus van alleen sterkte naar totaalprofiel.",
            "Toch blijft beleid per land en regio sterk verschillen. Wat in de ene omgeving normaal is, kan elders nog verboden of beperkt zijn.",
            "De historische lijn laat vooral zien dat cannabisbeleid niet statisch is. Het beweegt mee met onderzoek, cultuur en maatschappelijke prioriteiten.",
            "Wie de huidige markt wil begrijpen, heeft baat bij die geschiedenis. Context maakt duidelijk waarom regels en verwachtingen vandaag zo uiteenlopen.",
        ],
        externalLinks: [
            { label: "Britannica - Cannabis", href: "https://www.britannica.com/plant/marijuana" },
            { label: "EMCDDA - Cannabis overview", href: "https://www.emcdda.europa.eu/publications/topic-overviews/cannabis_en" },
            { label: "Rijksoverheid - Gedoogbeleid", href: "https://www.rijksoverheid.nl/onderwerpen/drugs/gedoogbeleid-softdrugs-en-coffeeshops" },
        ],
    },
    {
        slug: "wat-zijn-terpenen",
        title: "Wat zijn terpenen en waarom zijn ze relevant?",
        summary: "Een duidelijke uitleg over geurstoffen in cannabis en hoe terpeneprofielen je ervaring kunnen sturen.",
        image: "/images/pexels-myseeds-35643776.jpg",
        secondaryImage: "/images/pexels-myseeds-35643778.jpg",
        readTime: "7 min",
        tags: ["Terpenen", "Effect", "Productkennis"],
        paragraphs: [
            "Terpenen zijn aromatische stoffen die van nature voorkomen in planten. Ze zijn belangrijk voor geur en smaak, ook buiten cannabis.",
            "In cannabis zorgen terpenen voor herkenbare profielen zoals citrus, dennen, kruidig of aards. Die beschrijvingen zijn vaak direct te koppelen aan dominante terpenen.",
            "Bekende voorbeelden zijn limoneen, myrceen, pinene en linalool. Elk profiel kan een andere beleving ondersteunen, afhankelijk van de totale samenstelling.",
            "Veel gebruikers kijken vooral naar THC, maar dat is meestal maar een deel van het verhaal. Het terpeneprofiel geeft extra context over de verwachte ervaring.",
            "Sommige producten met vergelijkbaar THC-gehalte kunnen heel anders aanvoelen. Terpenen en cannabinoïden samen verklaren vaak dit verschil.",
            "In praktijk helpt het om smaken, terpenen en reviews naast elkaar te bekijken. Zo krijg je een realistischer beeld dan op basis van één getal.",
            "Terpenen zijn geen harde garantie op effect, maar wel een sterke aanwijzing. Persoonlijke gevoeligheid en setting blijven altijd belangrijk.",
            "Wanneer je gericht wilt kiezen, begin dan met smaak en gewenste effecten en filter daarna op profiel. Dat werkt vaak beter dan alleen op categorie.",
            "Ook versheid en bewaarmethode spelen mee. Een product dat slecht is bewaard kan aan aroma verliezen, waardoor het profiel minder duidelijk wordt.",
            "Door consistent je ervaringen te noteren, herken je na verloop van tijd welke terpenecombinaties voor jou goed werken.",
            "Terpenen maken productinformatie rijker en specifieker. Dat helpt beginners en ervaren gebruikers om gerichter keuzes te maken.",
            "Kort gezegd: terpenen zijn de laag tussen cijfers en beleving. Wie ze begrijpt, leest productkaarten veel effectiever.",
        ],
        externalLinks: [
            { label: "Leafly - What are terpenes?", href: "https://www.leafly.com/learn/cannabis-glossary/terpenes" },
            { label: "Healthline - Cannabis terpenes", href: "https://www.healthline.com/health/cannabis-terpenes" },
            { label: "PubMed - Cannabis terpenes studies", href: "https://pubmed.ncbi.nlm.nih.gov/?term=cannabis+terpenes" },
        ],
    },
    {
        slug: "thc-cbd-uitgelegd",
        title: "THC en CBD uitgelegd zonder ruis",
        summary: "Wat deze cannabinoïden doen, hoe percentages geïnterpreteerd kunnen worden en waarom balans belangrijk is.",
        image: "/images/pexels-rdne-8139067.jpg",
        secondaryImage: "/images/pexels-rdne-8139100.jpg",
        readTime: "8 min",
        tags: ["THC", "CBD", "Uitleg"],
        paragraphs: [
            "THC en CBD zijn twee bekende cannabinoïden binnen cannabis, maar ze gedragen zich verschillend in het lichaam.",
            "THC wordt vaak geassocieerd met psychoactieve effecten. Hoe dat uitpakt, hangt af van dosis, tolerantie, context en productvorm.",
            "CBD heeft doorgaans een ander profiel en wordt door gebruikers vaak als minder psychoactief ervaren. Het is geen één-op-één tegenpool van THC.",
            "Een hoog THC-percentage betekent niet automatisch beter of geschikter. Voor veel mensen werkt balans juist prettiger dan maximale sterkte.",
            "Producten met vergelijkbare THC kunnen toch anders aanvoelen door terpeneprofielen en overige cannabinoïden. Daarom is vergelijking op meerdere punten nuttig.",
            "Ook het moment van gebruik speelt mee. Een product dat ’s avonds prettig is, kan overdag minder passend zijn in dezelfde dosis.",
            "Begin daarom met je doel: ontspanning, focus of mild effect. Filter vervolgens op verhouding, profiel en gebruikersreviews.",
            "Bij nieuwe producten is stapsgewijs testen verstandiger dan direct opschalen. Zo voorkom je dat je over je eigen grens heen gaat.",
            "Lees percentages als richting, niet als uitkomstgarantie. Ze helpen bij selecteren, maar zeggen niet alles over jouw individuele ervaring.",
            "Door je eigen reacties bij te houden, bouw je sneller een persoonlijk kompas op. Dat maakt toekomstige keuzes voorspelbaarder.",
            "CBD-waarden onder 1% kunnen in praktijk beperkt bijdragen aan balans, maar context verschilt per product en gebruiker.",
            "De beste keuze is meestal niet de sterkste, maar de meest passende combinatie voor jouw situatie en intentie.",
        ],
        externalLinks: [
            { label: "WHO - Cannabidiol (CBD)", href: "https://www.who.int/medicines/access/controlled-substances/5.2_CBD.pdf" },
            { label: "NIDA - Cannabis facts", href: "https://nida.nih.gov/publications/drugfacts/cannabis-marijuana" },
            { label: "European Monitoring Centre - Cannabinoids", href: "https://www.emcdda.europa.eu/publications/topic-overviews/cannabis_en" },
        ],
    },
    {
        slug: "bewaren-van-producten",
        title: "Producten goed bewaren: zo blijft kwaliteit stabiel",
        summary: "Eenvoudige bewaartips om geur, smaak en consistentie zo goed mogelijk te behouden.",
        image: "/images/pexels-perfect-lens-16677967.jpg",
        secondaryImage: "/images/pexels-perfect-lens-6619578.jpg",
        readTime: "7 min",
        tags: ["Opslag", "Kwaliteit", "Praktisch"],
        paragraphs: [
            "Goede opslag is een onderschat onderdeel van productkwaliteit. Zelfs een goed product verliest snel karakter bij verkeerde omstandigheden.",
            "Licht, lucht en warmte zijn de belangrijkste factoren om onder controle te houden. Donker en koel bewaren is meestal de veiligste basis.",
            "Een luchtdichte verpakking helpt aroma en consistentie langer te behouden. Vermijd open bakjes of verpakkingen die vaak open blijven staan.",
            "Grote temperatuurschommelingen kunnen kwaliteit sneller doen afnemen. Stabiliteit is belangrijker dan extreem koud bewaren.",
            "Ook vochtigheid speelt mee. Te droog kan profiel afvlakken, te vochtig vergroot risico op kwaliteitsproblemen.",
            "Gebruik schone, droge opslagmaterialen en label producten duidelijk. Dat voorkomt verwisseling en helpt bij het volgen van houdbaarheid.",
            "Open verpakkingen alleen wanneer nodig. Elke blootstelling aan lucht verandert op termijn geur en smaak.",
            "Bewaar bij voorkeur uit direct zonlicht, ook als de verpakking donker lijkt. Indirecte warmtebronnen zijn vaak al voldoende om effect te hebben.",
            "Voor mobiel gebruik of onderweg is een kleine gesloten container praktischer dan los meenemen. Dat houdt het profiel stabieler.",
            "Controleer regelmatig op afwijkingen in geur of uiterlijk. Vroege signalen helpen om kwaliteitsschade te beperken.",
            "Door producten juist te bewaren, blijven je reviews en vergelijkingen consistenter. Je beoordeelt dan producteigenschappen in plaats van opslagfouten.",
            "Kwaliteit behouden begint na aankoop. Opslag is daarmee onderdeel van verantwoord gebruik en goede productkennis.",
        ],
        externalLinks: [
            { label: "Leafly - How to store cannabis", href: "https://www.leafly.com/learn/consume/cannabis-storage" },
            { label: "Healthline - Storage basics", href: "https://www.healthline.com/health/how-to-store-weed" },
            { label: "NORML - Cannabis storage", href: "https://norml.org/marijuana/library/cannabis-storage/" },
        ],
    },
    {
        slug: "wetgeving-en-gezond-verstand",
        title: "Wetgeving en gezond verstand",
        summary: "Waarom lokale regels leidend zijn en hoe je verantwoord keuzes maakt binnen het geldende beleid.",
        image: "/images/pexels-haley-bee-347725846-28862111.jpg",
        secondaryImage: "/images/pexels-diego-barros-2149566212-30682041.jpg",
        readTime: "8 min",
        tags: ["Wetgeving", "18+", "Bewust"],
        paragraphs: [
            "Wet- en regelgeving rondom cannabis verschilt sterk per land, regio en soms zelfs per gemeente. Lokale regels blijven altijd leidend.",
            "Een platform kan informatie geven, maar vervangt geen juridisch advies. Controleer daarom altijd actuele bronnen van overheid en bevoegde instanties.",
            "Verantwoord gedrag betekent ook dat je geen risico neemt in verkeer. Onder invloed deelnemen aan verkeer is onveilig én juridisch risicovol.",
            "Leeftijdsgrenzen bestaan om gezondheid en veiligheid te beschermen. Respecteer 18+ en voorkom normalisering richting minderjarigen.",
            "In de praktijk helpt het om vooraf te weten wat wel en niet toegestaan is waar je bent. Zo voorkom je misverstanden en onnodige risico’s.",
            "Ook bij reizen kunnen regels plots veranderen. Wat in de ene plaats gedoogd is, kan elders direct tot problemen leiden.",
            "Gezond verstand betekent bovendien dat je omgeving meetelt: gedeelde ruimtes, buren en openbare locaties vragen extra aandacht voor verantwoordelijkheid.",
            "Gebruik privacybewust en houd persoonlijke gegevens veilig. Deel alleen noodzakelijke informatie bij accountgebruik en reviews.",
            "Als je twijfelt over beleid of handhaving, kies de veilige route en stel gebruik uit. Onzekerheid is vaak een signaal om pas op de plaats te maken.",
            "Gemeentelijke regels over winkels en openingstijden kunnen verschillen. Check daarom altijd recente informatie bij bron of winkel zelf.",
            "Digitale informatie is behulpzaam, maar uiteindelijk ben jij verantwoordelijk voor je keuzes en naleving van regels.",
            "Wie regels combineert met verstandig gebruik, maakt het landschap veiliger voor zichzelf én voor de community.",
        ],
        externalLinks: [
            { label: "Rijksoverheid - Onderwerp drugs", href: "https://www.rijksoverheid.nl/onderwerpen/drugs" },
            { label: "Rijksoverheid - Coffeeshopbeleid", href: "https://www.rijksoverheid.nl/onderwerpen/drugs/gedoogbeleid-softdrugs-en-coffeeshops" },
            { label: "Openbaar Ministerie - Drugs", href: "https://www.om.nl/onderwerpen/drugs" },
        ],
    },
];

function TopicCard({ topic }: { topic: InfoTopic }) {
    return (
        <Card sx={{ borderRadius: 2, height: "100%", display: "flex", flexDirection: "column" }}>
            <CardMedia component="img" height="220" image={topic.image} alt={topic.title} />
            <CardContent sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }}>
                    <Chip size="small" label={topic.readTime} color="success" variant="outlined" />
                    {topic.tags.slice(0, 2).map((tag) => (
                        <Chip key={`${topic.slug}-${tag}`} size="small" label={tag} />
                    ))}
                </Stack>
                <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    {topic.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    {topic.summary}
                </Typography>
                <Box sx={{ mt: "auto" }}>
                    <Button variant="outlined" component={RouterLink} to={`/info/${topic.slug}`}>
                        Lees verder
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}

function InfoOverview() {
    return (
        <section style={{ textAlign: "left", margin: 30, paddingBottom: 90 }}>
            <Typography component="h1" variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                Info
            </Typography>
            <Typography component="h2" variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Verdieping over verantwoord gebruik, geschiedenis en inhoudelijke kennis over de cannabisplant.
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                    },
                }}
            >
                {infoTopics.map((topic) => (
                    <TopicCard key={topic.slug} topic={topic} />
                ))}
            </Box>
        </section>
    );
}

function TopicDetail({ topic }: { topic: InfoTopic }) {
    const currentIndex = infoTopics.findIndex((item) => item.slug === topic.slug);
    const previousTopic = currentIndex > 0 ? infoTopics[currentIndex - 1] : null;
    const nextTopic = currentIndex < infoTopics.length - 1 ? infoTopics[currentIndex + 1] : null;
    const sectionHeadings = ["Context", "Praktische Uitleg", "Toepassing", "Samenvatting"];

    const sections: SectionBlock[] = topic.paragraphs.slice(1).reduce<SectionBlock[]>((acc, paragraph, index) => {
        const sectionIndex = Math.floor(index / 3);
        if (!acc[sectionIndex]) {
            acc[sectionIndex] = {
                heading: sectionHeadings[sectionIndex] || `Onderdeel ${sectionIndex + 1}`,
                paragraphs: [],
            };
        }
        acc[sectionIndex].paragraphs.push(paragraph);
        return acc;
    }, []);

    const leadParagraph = topic.paragraphs[0] || topic.summary;
    const quoteParagraph = topic.paragraphs[1] || topic.summary;
    const articleDate = new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "long", year: "numeric" }).format(
        new Date(2026, Math.max(0, currentIndex), 3 + currentIndex)
    );

    return (
        <section style={{ textAlign: "left", margin: 30, paddingBottom: 90 }}>
            <Button component={RouterLink} to="/info" variant="text" sx={{ mb: 1.5 }}>
                Terug naar Info
            </Button>
            <Card sx={{ mb: 2.2, borderRadius: 2, boxShadow: "none", border: "none", bgcolor: "transparent" }}>
                <CardMedia component="img" image={topic.image} alt={topic.title} sx={{ maxHeight: { xs: 220, md: 360 }, objectFit: "cover" }} />
                <CardContent sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.6 } }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }} alignItems="center">
                        <Chip size="small" label={topic.readTime} color="success" variant="outlined" />
                        {topic.tags.map((tag) => (
                            <Chip key={`${topic.slug}-${tag}`} size="small" label={tag} />
                        ))}
                    </Stack>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.8 }}>
                        Gepubliceerd op {articleDate} • Door WeedInfo redactie
                    </Typography>
                    <Typography component="h1" variant="h4" sx={{ color: "text.secondary", fontWeight: 800, mb: 1 }}>
                        {topic.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 920, mb: 0.8, lineHeight: 1.8 }}>
                        {topic.summary}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic", mt: 1, maxWidth: 900 }}>
                        <em>Tip:</em> vergelijk op <strong>type</strong>, <strong>terpenen</strong> en <strong>reviews</strong> voor een vollediger beeld dan alleen THC.
                    </Typography>
                </CardContent>
            </Card>

            <Box sx={{ maxWidth: 940 }}>
                <Typography
                    variant="h6"
                    sx={{
                        color: "text.primary",
                        lineHeight: 1.75,
                        fontWeight: 400,
                        mb: 2,
                        pl: { xs: 0, md: 2 },
                        borderLeft: { xs: "none", md: "4px solid #c8e6c9" },
                    }}
                >
                    {leadParagraph}
                </Typography>

                <Box
                    sx={{
                        backgroundColor: "#f6faf7",
                        borderRadius: 2,
                        px: { xs: 1.5, md: 2.2 },
                        py: { xs: 1.2, md: 1.6 },
                        mb: 2.2,
                        border: "1px solid #e3efe5",
                    }}
                >
                    <Typography variant="body1" sx={{ color: "text.secondary", fontStyle: "italic", lineHeight: 1.75 }}>
                        “{quoteParagraph}”
                    </Typography>
                </Box>

                {sections.map((section, sectionIndex) => (
                    <Box key={`${topic.slug}-section-${sectionIndex}`} sx={{ mb: 2.2 }}>
                        <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 800, mb: 0.8, mt: sectionIndex === 0 ? 0.2 : 1.2 }}>
                            {section.heading}
                        </Typography>
                        {section.paragraphs.map((paragraph, index) => (
                            <Typography
                                key={`${topic.slug}-p-${sectionIndex}-${index}`}
                                variant="body1"
                                sx={{ color: "text.secondary", mb: 1.2, lineHeight: 1.78 }}
                            >
                                {paragraph}
                            </Typography>
                        ))}
                        {sectionIndex === 1 && (
                            <Card sx={{ mt: 1.2, mb: 1.4, borderRadius: 2 }}>
                                <CardMedia component="img" image={topic.secondaryImage} alt={`${topic.title} illustratie`} sx={{ maxHeight: { xs: 190, md: 280 }, objectFit: "cover" }} />
                            </Card>
                        )}
                    </Box>
                ))}
            </Box>

            <Box sx={{ mb: 2.4 }}>
                <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.8 }}>
                    Externe bronnen
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.8, lineHeight: 1.75 }}>
                    Lees ook meer via{" "}
                    <Link href={topic.externalLinks[0].href} target="_blank" rel="noreferrer">
                        {topic.externalLinks[0].label}
                    </Link>
                    {" "}en vergelijk dit met{" "}
                    <Link href={topic.externalLinks[1].href} target="_blank" rel="noreferrer">
                        {topic.externalLinks[1].label}
                    </Link>
                    .
                </Typography>
                <Stack spacing={0.5}>
                    {topic.externalLinks.map((source) => (
                        <Link key={`${topic.slug}-${source.href}`} href={source.href} target="_blank" rel="noreferrer" sx={{ width: "fit-content" }}>
                            {source.label}
                        </Link>
                    ))}
                </Stack>
            </Box>

            <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ mt: 2 }}>
                {previousTopic ? (
                    <Button component={RouterLink} to={`/info/${previousTopic.slug}`} variant="outlined">
                        Vorige: {previousTopic.title}
                    </Button>
                ) : (
                    <Box />
                )}
                {nextTopic ? (
                    <Button component={RouterLink} to={`/info/${nextTopic.slug}`} variant="contained">
                        Volgende: {nextTopic.title}
                    </Button>
                ) : (
                    <Box />
                )}
            </Stack>
        </section>
    );
}

export default function PageBlog() {
    const params = useParams<{ "*": string }>();
    const slug = String(params["*"] || "").replace(/^\/+|\/+$/g, "");
    if (!slug) return <InfoOverview />;

    const topic = infoTopics.find((item) => item.slug === slug);
    if (!topic) {
        return (
            <section style={{ textAlign: "left", margin: 30, paddingBottom: 90 }}>
                <Typography component="h1" variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    Info artikel niet gevonden
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Dit onderwerp bestaat (nog) niet of is verplaatst.
                </Typography>
                <Button component={RouterLink} to="/info" variant="contained">
                    Terug naar Info
                </Button>
            </section>
        );
    }

    return <TopicDetail topic={topic} />;
}
