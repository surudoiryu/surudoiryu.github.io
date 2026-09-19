import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import DirectionsCarFilledOutlinedIcon from "@mui/icons-material/DirectionsCarFilledOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import "./HealthInfoPage.css";

const sources = [
  { label: "Trimbos-instituut — Cannabis", href: "https://www.trimbos.nl/kennis/drugs/informatiepermiddel/cannabis/" },
  { label: "Jellinek — Cannabis", href: "https://www.jellinek.nl/informatie-over-alcohol-drugs/cannabis/" },
  { label: "Rijksoverheid — Regels cannabis", href: "https://www.rijksoverheid.nl/onderwerpen/drugs/regels-cannabis" },
];

export default function HealthInfoPage() {
  return <Box component="article" className="health-page">
    <Box component="header" className="health-hero">
      <Container maxWidth="md" className="health-hero-inner">
        <Chip label="Onafhankelijke gezondheidsinformatie" color="success" variant="outlined" />
        <Typography component="h1" variant="h3" fontWeight={850}>Gezondheid en risico’s</Typography>
        <Typography className="health-lead">Cannabis kan prettig worden ervaren, maar gebruik is niet zonder risico. Wat iemand merkt hangt onder meer af van de persoon, het product, de hoeveelheid, de gebruikswijze en de omgeving.</Typography>
        <Box className="health-advice"><HealthAndSafetyOutlinedIcon aria-hidden="true" /><span><strong>Goed om te weten:</strong> deze informatie is algemeen en geen persoonlijk medisch advies. Bespreek vragen over gezondheid, zwangerschap of medicatie met een arts.</span></Box>
      </Container>
    </Box>

    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <nav className="health-toc" aria-label="Op deze pagina">
        <strong>Op deze pagina</strong>
        <a href="#werking">Werking</a><a href="#risicos">Risico’s</a><a href="#extra-voorzichtig">Extra voorzichtig</a><a href="#vervelende-ervaring">Vervelende ervaring</a><a href="#hulp">Hulp en bronnen</a>
      </nav>

      <section className="health-highlights" aria-label="Belangrijkste aandachtspunten">
        <div><PsychologyOutlinedIcon /><strong>Effect verschilt</strong><span>Dezelfde hoeveelheid kan per persoon en moment anders uitpakken.</span></div>
        <div><DirectionsCarFilledOutlinedIcon /><strong>Niet in het verkeer</strong><span>Reactievermogen, aandacht en inschatting kunnen verminderen.</span></div>
        <div><WarningAmberRoundedIcon /><strong>Sterkte telt mee</strong><span>Meer THC of een hogere dosis kan ongewenste effecten versterken.</span></div>
      </section>

      <div className="health-layout">
        <main>
          <section id="werking" className="health-section">
            <Typography component="p" className="health-kicker">01 — Werking</Typography>
            <Typography component="h2" variant="h4" fontWeight={800}>Wat cannabis met lichaam en geest kan doen</Typography>
            <p>THC is de cannabinoïde die vooral verantwoordelijk is voor het bedwelmende effect. Het beïnvloedt onder andere waarneming, stemming, geheugen, coördinatie en reactievermogen. CBD veroorzaakt niet op dezelfde manier een high. De verhouding tussen stoffen vertelt echter nooit precies hoe één persoon zal reageren.</p>
            <p>Mogelijke kortdurende effecten zijn ontspanning, veranderde zintuiglijke waarneming, een ander tijdsbesef en meer eetlust. Er kunnen ook minder prettige effecten ontstaan, zoals een droge mond, duizeligheid, misselijkheid, hartkloppingen, moeite met concentreren, angst, paniek of achterdocht.</p>
            <div className="health-note"><strong>Productvorm maakt verschil.</strong> Bij inhaleren wordt het effect doorgaans sneller merkbaar. Bij eetbare cannabis kan het effect later beginnen en langer aanhouden. Daardoor bestaat het risico dat iemand te snel extra neemt.</div>
          </section>

          <section id="risicos" className="health-section">
            <Typography component="p" className="health-kicker">02 — Risico’s</Typography>
            <Typography component="h2" variant="h4" fontWeight={800}>Hoeveelheid, sterkte en frequentie</Typography>
            <p>Hoe groter de hoeveelheid en hoe hoger het THC-gehalte, hoe sterker de effecten meestal worden. Ook weinig slaap, spanning, een onbekende omgeving of weinig ervaring kunnen bijdragen aan een onprettige reactie. Een productnaam of percentage is daarom geen voorspelling van de persoonlijke ervaring.</p>
            <p>Regelmatig gebruik kan leiden tot gewenning: er is dan meer nodig om hetzelfde effect te voelen. Sommige mensen ontwikkelen afhankelijkheid en ervaren moeite met minderen of stoppen. Signalen kunnen zijn dat gebruik steeds meer tijd inneemt, afspraken of verplichtingen beïnvloedt, of doorgaat ondanks problemen.</p>
            <h3>Combineren met alcohol, medicijnen of andere middelen</h3>
            <p>Combinaties kunnen effecten versterken of onvoorspelbaar maken. Alcohol en cannabis samen kunnen bijvoorbeeld duizeligheid, misselijkheid en verlies van controle versterken. Medicijnen kunnen eveneens wisselwerken. Vraag een arts of apotheker om advies wanneer je medicatie gebruikt.</p>
            <h3>Mentale gezondheid</h3>
            <p>Cannabis kan angstige of paranoïde gevoelens oproepen. Bij mensen met aanleg voor psychotische klachten kan cannabis klachten uitlokken of verergeren. Extra voorzichtigheid is nodig bij bestaande psychische klachten of wanneer psychose in de familie voorkomt.</p>
          </section>

          <section id="extra-voorzichtig" className="health-section">
            <Typography component="p" className="health-kicker">03 — Extra voorzichtig</Typography>
            <Typography component="h2" variant="h4" fontWeight={800}>Situaties waarin gebruik extra risico geeft</Typography>
            <div className="health-situation-grid">
              <div><strong>Verkeer en machines</strong><p>Rijd niet en bedien geen machines onder invloed. Ook wanneer het sterkste gevoel voorbij lijkt, kunnen aandacht en reactievermogen nog verminderd zijn.</p></div>
              <div><strong>Zwangerschap en borstvoeding</strong><p>Gebruik geen cannabis tijdens zwangerschap of borstvoeding. Bespreek gebruik of stoppen met een arts of verloskundige.</p></div>
              <div><strong>Jongeren</strong><p>De hersenen zijn nog in ontwikkeling. Jong beginnen en vaker gebruiken hangen samen met grotere risico’s. WeedInfo is uitsluitend bedoeld voor volwassenen.</p></div>
              <div><strong>Gezondheid en medicatie</strong><p>Vraag medisch advies bij hartproblemen, psychische klachten, medicijngebruik of eerdere heftige reacties. Stel gebruik uit wanneer je je lichamelijk of mentaal niet goed voelt.</p></div>
            </div>
          </section>

          <section id="vervelende-ervaring" className="health-section health-emergency">
            <Typography component="p" className="health-kicker">04 — Als het niet goed voelt</Typography>
            <Typography component="h2" variant="h4" fontWeight={800}>Wat te doen bij een vervelende ervaring</Typography>
            <ol><li>Ga naar een rustige, veilige plek en beperk licht, geluid en andere prikkels.</li><li>Blijf bij iemand die je vertrouwt. Adem rustig en herinner jezelf eraan dat het effect weer afneemt.</li><li>Neem geen extra cannabis, alcohol of andere middelen en neem niet deel aan het verkeer.</li><li>Laat iemand alleen eten of drinken wanneer diegene goed bij bewustzijn is en dit zelfstandig kan.</li></ol>
            <div className="health-urgent"><strong>Bel 112</strong> bij bewusteloosheid, ademhalingsproblemen, ernstige pijn op de borst, een insult, gevaarlijk gedrag of een andere acute onveilige situatie.</div>
          </section>
        </main>

        <aside className="health-aside">
          <img src="/images/pexels-rdne-8139067.jpg" alt="Rustige informatieve omgeving" loading="lazy" decoding="async" width="480" height="320" />
          <div><strong>Wanneer hulp zoeken?</strong><p>Neem contact op met je huisarts of verslavingszorg wanneer gebruik moeilijk te controleren is, klachten terugkeren of cannabis invloed krijgt op slaap, stemming, studie, werk of relaties.</p></div>
        </aside>
      </div>

      <section id="hulp" className="health-sources">
        <div><Typography component="p" className="health-kicker">Verder lezen</Typography><Typography component="h2" variant="h4" fontWeight={800}>Betrouwbare informatie en hulp</Typography><p>Onderstaande organisaties bieden actuele informatie. Bij persoonlijke gezondheidsvragen is een arts de aangewezen gesprekspartner.</p></div>
        <Stack spacing={1}>{sources.map(source => <Button key={source.href} href={source.href} target="_blank" rel="noreferrer" variant="outlined" color="success" endIcon={<OpenInNewIcon />} sx={{ justifyContent: "space-between", textTransform: "none" }}>{source.label}</Button>)}</Stack>
      </section>
      <Typography variant="caption" color="text.secondary" display="block" mt={3}>Inhoud laatst gecontroleerd: september 2026.</Typography>
    </Container>
  </Box>;
}
