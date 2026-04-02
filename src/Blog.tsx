import { Button, Card, CardContent, CardMedia, Typography } from "@mui/material";
import logo from "./logo.svg";

const posts = [
    {
        title: "Wat is het verschil tussen Sativa, Indica en Hybrid?",
        summary:
            "Een korte uitleg over genetica, terpenen en waarom effecten per persoon verschillen.",
        image:
            "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&w=1400&q=80",
        url: "https://en.wikipedia.org/wiki/Cannabis",
    },
    {
        title: "THC/CBD uitgelegd in begrijpelijke taal",
        summary:
            "Waar je op let als je een soortje kiest op basis van percentages en balans.",
        image:
            "https://images.unsplash.com/photo-1607619739154-094f0c8eb11e?auto=format&fit=crop&w=1400&q=80",
        url: "https://en.wikipedia.org/wiki/Tetrahydrocannabinol",
    },
    {
        title: "Bewaren en gebruiken: praktische tips",
        summary:
            "Tips om kwaliteit te behouden en je ervaring beter te sturen.",
        image:
            "https://images.unsplash.com/photo-1536816579748-4ecb3f03d72a?auto=format&fit=crop&w=1400&q=80",
        url: "https://en.wikipedia.org/wiki/Cannabis_(drug)",
    },
];

export default function PageBlog() {
    return (
        <section style={{ textAlign: "left", margin: 30, paddingBottom: 90 }}>
            <header className="App-header" style={{ minHeight: 180 }}>
                <img src={logo} className="App-logo" alt="logo" />
            </header>
            <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                Blog
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Artikelen en uitleg over soortjes, effecten en slimme keuzes.
            </Typography>

            {posts.map((post) => (
                <Card key={post.title} sx={{ mb: 3 }}>
                    <CardMedia
                        component="img"
                        height="220"
                        image={post.image}
                        alt={post.title}
                    />
                    <CardContent>
                        <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            {post.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                            {post.summary}
                        </Typography>
                        <Button
                            variant="outlined"
                            component="a"
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Lees verder
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </section>
    );
}
