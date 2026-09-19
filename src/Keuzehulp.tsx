import { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { onSnapshot } from "firebase/firestore";
import { effectCollectionRef, tasteCollectionRef } from "./firebaseCollections";

type Experience = "beginner" | "gevorderd" | "expert";
type ProductType = "Sativa" | "Indica" | "Hybrid" | "all";
type Strength = "mild" | "balanced" | "sterk";
type Preference = "smaken" | "effecten";
type ProductForm = "wiet" | "hash" | "joint" | "rosin" | "edible" | "";

type Answers = {
    experience?: Experience;
    type?: ProductType;
    strength?: Strength;
    form?: ProductForm;
    taste?: string[];
    effect?: string[];
    preference?: Preference;
};

type Question = {
    key: keyof Answers;
    title: string;
    subtitle: string;
    options: Array<{ label: string; value?: string; values?: string[] }>;
};

const baseQuestions: Question[] = [
    {
        key: "experience",
        title: "Wat is je ervaring?",
        subtitle: "Dit helpt om een passende intensiteit te kiezen.",
        options: [
            { label: "Beginner", value: "beginner" },
            { label: "Gevorderd", value: "gevorderd" },
            { label: "Expert", value: "expert" },
        ],
    },
    {
        key: "strength",
        title: "Welke sterkte past het best?",
        subtitle: "We gebruiken dit voor een THC-range filter.",
        options: [
            { label: "Mild", value: "mild" },
            { label: "Gebalanceerd", value: "balanced" },
            { label: "Sterker", value: "sterk" },
        ],
    },
    {
        key: "form",
        title: "Welke productvorm zoek je?",
        subtitle: "Dit gebruiken we als extra zoekfilter.",
        options: [
            { label: "Wiet", value: "wiet" },
            { label: "Hasj / Hash", value: "hasj" },
            { label: "Joint", value: "joint" },
            { label: "Rosin", value: "rosin" },
            { label: "Edible", value: "edible" },
            { label: "Geen voorkeur", value: "" },
        ],
    },
    {
        key: "type",
        title: "Welke soort spreekt je aan?",
        subtitle: "Kies een richting voor het type product.",
        options: [
            { label: "Sativa", value: "Sativa" },
            { label: "Indica", value: "Indica" },
            { label: "Hybrid", value: "Hybrid" },
            { label: "Geen voorkeur", value: "all" },
        ],
    },
    {
        key: "preference",
        title: "Waar wil je vooral op filteren?",
        subtitle: "Kies of smaak of effect de prioriteit heeft.",
        options: [
            { label: "Smaak", value: "smaken" },
            { label: "Effect", value: "effecten" },
        ],
    },
];

function toThcRange(experience: Experience | undefined, strength: Strength | undefined): [number, number] {
    if (experience === "beginner") return [0, 12];
    if (strength === "mild") return [0, 15];
    if (strength === "sterk") return [20, 35];
    if (experience === "expert") return [22, 35];
    if (experience === "gevorderd") return [16, 32];
    return [10, 24];
}

function normalize(input: string): string {
    return input.toLowerCase().trim();
}

function getBeginnerTasteGroups(allTastes: string[]): Array<{ label: string; values: string[] }> {
    const normalizedTastes = allTastes.map((name) => ({ name, key: normalize(name) }));
    const byKeywords = (keywords: string[]) =>
        normalizedTastes
            .filter((item) => keywords.some((keyword) => item.key.includes(keyword)))
            .map((item) => item.name);

    const fruitig = byKeywords(["citrus", "bes", "trop", "zoet", "fruit"]);
    const aardsKruidig = byKeywords(["aards", "kruid", "hout", "den"]);
    const prikkelend = byKeywords(["diesel", "spicy", "scherp"]);

    const fallback = allTastes.slice(0, 6);
    const groups = [
        { label: "Fruitig & fris", values: fruitig.length ? fruitig : fallback.slice(0, 3) },
        { label: "Aards & kruidig", values: aardsKruidig.length ? aardsKruidig : fallback.slice(2, 5) },
        { label: "Prikkelend & uitgesproken", values: prikkelend.length ? prikkelend : fallback.slice(4, 6) },
    ].filter((group) => group.values.length > 0);

    return groups;
}

function getBeginnerEffectGroups(allEffects: string[]): Array<{ label: string; values: string[] }> {
    const normalizedEffects = allEffects.map((name) => ({ name, key: normalize(name) }));
    const byKeywords = (keywords: string[]) =>
        normalizedEffects
            .filter((item) => keywords.some((keyword) => item.key.includes(keyword)))
            .map((item) => item.name);

    const rustig = byKeywords(["ontspann", "rust", "kalm"]);
    const actief = byKeywords(["focus", "creativ", "energie", "eufor"]);
    const comfort = byKeywords(["pijn", "comfort", "slaap"]);

    const fallback = allEffects.slice(0, 6);
    const groups = [
        { label: "Rustig & ontspannen", values: rustig.length ? rustig : fallback.slice(0, 2) },
        { label: "Actief & scherp", values: actief.length ? actief : fallback.slice(2, 4) },
        { label: "Comfort & balans", values: comfort.length ? comfort : fallback.slice(4, 6) },
    ].filter((group) => group.values.length > 0);

    return groups;
}

function getTasteQuestion(experience: Experience | undefined, allTastes: string[]): Question {
    if (experience === "beginner") {
        const groups = getBeginnerTasteGroups(allTastes);
        return {
            key: "taste",
            title: "Welke smaakrichting past bij je?",
            subtitle: "Voor beginners bundelen we smaken in duidelijke groepen.",
            options: [...groups.map((group) => ({ label: group.label, values: group.values })), { label: "Geen voorkeur", value: "" }],
        };
    }

    return {
        key: "taste",
        title: "Welke smaakvoorkeur heb je?",
        subtitle: "Kies een profiel dat bij je past.",
        options: [...allTastes.slice(0, 16).map((taste) => ({ label: taste, value: taste })), { label: "Geen voorkeur", value: "" }],
    };
}

function getEffectQuestion(experience: Experience | undefined, allEffects: string[]): Question {
    if (experience === "beginner") {
        const groups = getBeginnerEffectGroups(allEffects);
        return {
            key: "effect",
            title: "Welk gevoel zoek je vooral?",
            subtitle: "Voor beginners bundelen we effecten in herkenbare richtingen.",
            options: [...groups.map((group) => ({ label: group.label, values: group.values })), { label: "Geen voorkeur", value: "" }],
        };
    }

    return {
        key: "effect",
        title: "Welk positief effect zoek je?",
        subtitle: "Kies een effectrichting voor je filter.",
        options: [...allEffects.slice(0, 16).map((effect) => ({ label: effect, value: effect })), { label: "Geen voorkeur", value: "" }],
    };
}

function buildQuestions(answers: Answers, allTastes: string[], allEffects: string[]): Question[] {
    const isBeginner = answers.experience === "beginner";
    return baseQuestions
        .filter((question) => {
            if (question.key === "type" && isBeginner) return false;
            if (question.key === "strength" && isBeginner) return false;
            return true;
        })
        .flatMap((question) => {
            if (question.key === "preference") {
                return [
                    question,
                    answers.preference === "smaken"
                        ? getTasteQuestion(answers.experience, allTastes)
                        : getEffectQuestion(answers.experience, allEffects),
                ];
            }
            return [question];
        });
}

export default function PageKeuzehulp() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Answers>({});
    const [allTastes, setAllTastes] = useState<string[]>([]);
    const [allEffects, setAllEffects] = useState<string[]>([]);

    useEffect(() => {
        const unsubscribeTastes = onSnapshot(tasteCollectionRef, (snapshot) => {
            const next = snapshot.docs
                .map((item) => String((item.data() as { name?: string }).name || "").trim())
                .filter(Boolean);
            setAllTastes(Array.from(new Set(next)).sort((a, b) => a.localeCompare(b)));
        });

        const unsubscribeEffects = onSnapshot(effectCollectionRef, (snapshot) => {
            const next = snapshot.docs
                .map((item) => {
                    const data = item.data() as { name?: string; positive?: boolean };
                    if (data.positive === false) return "";
                    return String(data.name || "").trim();
                })
                .filter(Boolean);
            setAllEffects(Array.from(new Set(next)).sort((a, b) => a.localeCompare(b)));
        });

        return () => {
            unsubscribeTastes();
            unsubscribeEffects();
        };
    }, []);

    const dynamicQuestions = useMemo(() => buildQuestions(answers, allTastes, allEffects), [answers, allEffects, allTastes]);
    const currentQuestion = dynamicQuestions[step];
    const progress = useMemo(
        () => ((step + 1) / Math.max(1, dynamicQuestions.length)) * 100,
        [step, dynamicQuestions.length]
    );

    const handleChoose = (option: { label: string; value?: string; values?: string[] }) => {
        if (!currentQuestion) return;
        const value = option.value ?? "";
        const values = option.values ?? [];
        const resolvedValue: string | string[] =
            (currentQuestion.key === "taste" || currentQuestion.key === "effect")
                ? (values.length ? values : (value ? [value] : []))
                : value;

        const nextAnswers: Answers = {
            ...answers,
            [currentQuestion.key]: resolvedValue,
        };
        setAnswers(nextAnswers);
        const nextQuestions = buildQuestions(nextAnswers, allTastes, allEffects);

        const nextStep = step + 1;
        if (nextStep < nextQuestions.length) {
            setStep(nextStep);
            return;
        }

        const params = new URLSearchParams();
        if (nextAnswers.type && nextAnswers.type !== "all") params.set("type", nextAnswers.type);
        if (nextAnswers.form) params.set("q", nextAnswers.form);
        const [thcMin, thcMax] = toThcRange(nextAnswers.experience, nextAnswers.strength);
        params.set("thcMin", String(thcMin));
        params.set("thcMax", String(thcMax));
        params.set("cbdMin", "0");
        params.set("cbdMax", nextAnswers.experience === "beginner" ? "8" : "12");
        if (nextAnswers.preference === "smaken" && nextAnswers.taste?.length) {
            params.set("tastes", nextAnswers.taste.join(","));
        }
        if (nextAnswers.preference === "effecten" && nextAnswers.effect?.length) {
            params.set("effects", nextAnswers.effect.join(","));
        }
        if (nextAnswers.experience === "beginner") {
            params.set("withReviews", "1");
            params.set("minRating", "3");
        }

        navigate(`/cannabis?${params.toString()}`);
    };

    return (
        <section style={{ paddingBottom: 90, margin: "8px 14px 0" }}>
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardContent>
                    <Typography component="h1" variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                        Keuzehulp
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.2 }}>
                        Beantwoord een paar korte vragen en krijg direct een gefilterd overzicht van producten die bij je voorkeur passen.
                    </Typography>
                    <LinearProgress variant="determinate" value={progress} color="success" sx={{ borderRadius: 999 }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.6, display: "block" }}>
                        Vraag {step + 1} van {dynamicQuestions.length}
                    </Typography>
                </CardContent>
            </Card>

            <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                    {!currentQuestion ? (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            Keuzehulp wordt geladen...
                        </Typography>
                    ) : (
                        <>
                    <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.6 }}>
                        {currentQuestion.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.2 }}>
                        {currentQuestion.subtitle}
                    </Typography>
                    <Stack spacing={1}>
                        {currentQuestion.options.map((option) => (
                            <Button
                                key={`${currentQuestion.key}-${option.value ?? option.values?.join("|") ?? option.label}-${option.label}`}
                                variant="outlined"
                                color="success"
                                onClick={() => handleChoose(option)}
                                sx={{ justifyContent: "space-between" }}
                            >
                                <span>{option.label}</span>
                                <Chip size="small" label="Kies" color="success" variant="outlined" />
                            </Button>
                        ))}
                    </Stack>
                    <Box sx={{ mt: 1.2 }}>
                        <Button
                            color="inherit"
                            onClick={() => {
                                if (step === 0) {
                                    navigate("/cannabis");
                                    return;
                                }
                                setStep((prev) => prev - 1);
                            }}
                        >
                            {step === 0 ? "Annuleren" : "Vorige vraag"}
                        </Button>
                    </Box>
                        </>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
