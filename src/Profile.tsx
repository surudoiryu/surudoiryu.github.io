import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControlLabel,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useAuth } from "./context/AuthContext";
import { ProductReview, UserProfile } from "./types/user";
import { productCollectionRef } from "./firebaseCollections";
import { Link, useParams } from "react-router-dom";

type ProfileViewProps = {
    activeProfile: UserProfile;
    reviews: ProductReview[];
};

function ProfileHeader({ activeProfile }: { activeProfile: UserProfile }) {
    return (
        <Card sx={{ mb: 2 }}>
            <div
                style={{
                    height: 140,
                    backgroundImage: activeProfile.headerImageUrl
                        ? `url(${activeProfile.headerImageUrl})`
                        : "linear-gradient(120deg, #1b5e20 0%, #33691e 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />
            <CardContent sx={{ mt: -6 }}>
                <Avatar
                    src={activeProfile.avatarUrl}
                    alt={activeProfile.displayName}
                    sx={{ width: 88, height: 88, border: "3px solid white", mb: 1 }}
                />
                <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    {activeProfile.displayName}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    @{activeProfile.username}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                    {activeProfile.bio || "Nog geen bio toegevoegd."}
                </Typography>
            </CardContent>
        </Card>
    );
}

function ProfileView({ activeProfile, reviews }: ProfileViewProps) {
    const [likedNames, setLikedNames] = useState<string[]>([]);

    React.useEffect(() => {
        if (!activeProfile.likedProducts.length) {
            setLikedNames([]);
            return;
        }

        const unsubscribe = onSnapshot(productCollectionRef, (snapshot) => {
            const titles = snapshot.docs
                .map((item) => item.data())
                .filter((item) => activeProfile.likedProducts.includes(item.shortcode))
                .map((item) => (item.title as string) ?? "Onbekend soortje");
            setLikedNames(titles);
        });

        return () => unsubscribe();
    }, [activeProfile.likedProducts]);

    return (
        <>
            <ProfileHeader activeProfile={activeProfile} />

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Gelikete soortjes
            </Typography>
            {!likedNames.length ? (
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Nog geen likes.
                </Typography>
            ) : (
                <Box sx={{ mb: 2 }}>
                    {likedNames.map((name, index) => (
                        <Chip
                            key={`${name}-${index}`}
                            label={name}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                        />
                    ))}
                </Box>
            )}

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600, mt: 2 }}>
                Mijn reviews
            </Typography>
            {!reviews.length ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Nog geen reviews geplaatst.
                </Typography>
            ) : (
                reviews.map((item) => (
                    <Card key={item.id} sx={{ mb: 1 }}>
                        <CardContent>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                {item.productTitle} ({item.rating}/5)
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                                {item.userName}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                {item.review}
                            </Typography>
                        </CardContent>
                    </Card>
                ))
            )}
        </>
    );
}

export default function Profile() {
    const { user, profile, reviews, logout, setPushEnabled, updateProfileDetails } = useAuth();
    const { uid } = useParams();
    const [error, setError] = useState<string | null>(null);
    const [sharedProfile, setSharedProfile] = useState<UserProfile | null>(null);
    const [sharedLookup, setSharedLookup] = useState("");
    const [sharedReviews, setSharedReviews] = useState<ProductReview[]>([]);

    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [headerImageUrl, setHeaderImageUrl] = useState("");
    const [bio, setBio] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);

    const loadLocalImage = useCallback(
        (file: File | undefined, setter: (value: string) => void) => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === "string") {
                    setter(reader.result);
                }
            };
            reader.readAsDataURL(file);
        },
        []
    );

    React.useEffect(() => {
        if (!profile) return;
        setDisplayName(profile.displayName || "");
        setUsername(profile.username || "");
        setAvatarUrl(profile.avatarUrl || "");
        setHeaderImageUrl(profile.headerImageUrl || "");
        setBio(profile.bio || "");
    }, [profile]);

    const activeProfile = useMemo(() => sharedProfile ?? profile, [sharedProfile, profile]);
    const activeReviews = sharedProfile ? sharedReviews : reviews;
    const isPublicView = Boolean(sharedProfile);

    const handleShareLookup = useCallback(async (overrideLookup?: string) => {
        setError(null);
        setSharedProfile(null);
        setSharedReviews([]);

        const target = (overrideLookup ?? sharedLookup).trim();
        if (!target) return;

        try {
            let resolvedUid = target;
            let profileData: UserProfile | null = null;

            const byUid = await getDoc(doc(db, "users", target));
            if (byUid.exists()) {
                profileData = byUid.data() as UserProfile;
            } else {
                const byUsername = await getDocs(query(collection(db, "users"), where("username", "==", target.toLowerCase())));
                if (!byUsername.empty) {
                    resolvedUid = byUsername.docs[0].id;
                    profileData = byUsername.docs[0].data() as UserProfile;
                }
            }

            if (!profileData) {
                throw new Error("Profiel niet gevonden.");
            }

            setSharedProfile({
                ...profileData,
                uid: resolvedUid,
            });

            const reviewQuery = query(collection(db, "reviews"), where("userId", "==", resolvedUid));
            const snapshot = await getDocs(reviewQuery);
            setSharedReviews(
                snapshot.docs.map((item) => ({
                    id: item.id,
                    ...(item.data() as Omit<ProductReview, "id">),
                }))
            );
        } catch (lookupError) {
            const message =
                lookupError instanceof Error ? lookupError.message : "Profiel kon niet geladen worden.";
            setError(message);
        }
    }, [sharedLookup]);

    React.useEffect(() => {
        if (uid) {
            setSharedLookup(uid);
            handleShareLookup(uid);
        }
    }, [uid, handleShareLookup]);

    const handlePushToggle = async (checked: boolean) => {
        setError(null);
        try {
            await setPushEnabled(checked);
        } catch (toggleError) {
            const message =
                toggleError instanceof Error
                    ? toggleError.message
                    : "Push-instelling kon niet bijgewerkt worden.";
            setError(message);
        }
    };

    const handleSaveProfile = async () => {
        setError(null);
        try {
            setSavingProfile(true);
            await updateProfileDetails({
                displayName,
                username,
                avatarUrl,
                headerImageUrl,
                bio,
            });
            setIsEditing(false);
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Profiel opslaan mislukt.";
            setError(message);
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <section style={{ textAlign: "left", margin: 16, paddingBottom: 88 }}>
            <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 600, mb: 2 }}>
                Profiel
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!isPublicView && user && profile && (
                <Card sx={{ borderRadius: 3, mb: 2 }}>
                    <CardContent>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(profile.pushEnabled)}
                                        onChange={(event) => handlePushToggle(event.target.checked)}
                                    />
                                }
                                label="Pushmeldingen"
                            />
                            <Button variant="outlined" onClick={() => setIsEditing((prev) => !prev)}>
                                {isEditing ? "Bewerken sluiten" : "Profiel bewerken"}
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {!isPublicView && isEditing && (
                <Card sx={{ borderRadius: 3, mb: 2 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                            Publiek profiel instellen
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <TextField fullWidth label="Naam" size="small" value={displayName} onChange={(e) => setDisplayName(e.target.value)} sx={{ mb: 1.5 }} />
                        <TextField fullWidth label="Gebruikersnaam" size="small" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 1.5 }} />
                        <TextField fullWidth label="Thumbnail URL" size="small" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} sx={{ mb: 1 }} />
                        <Button component="label" variant="text" size="small" sx={{ mb: 1.5 }}>
                            Of kies thumbnail bestand
                            <input
                                hidden
                                accept="image/*"
                                type="file"
                                onChange={(event) => loadLocalImage(event.target.files?.[0], setAvatarUrl)}
                            />
                        </Button>
                        <TextField fullWidth label="Header afbeelding URL" size="small" value={headerImageUrl} onChange={(e) => setHeaderImageUrl(e.target.value)} sx={{ mb: 1 }} />
                        <Button component="label" variant="text" size="small" sx={{ mb: 1.5 }}>
                            Of kies header bestand
                            <input
                                hidden
                                accept="image/*"
                                type="file"
                                onChange={(event) => loadLocalImage(event.target.files?.[0], setHeaderImageUrl)}
                            />
                        </Button>
                        <TextField fullWidth multiline minRows={2} label="Korte bio" size="small" value={bio} onChange={(e) => setBio(e.target.value)} sx={{ mb: 1.5 }} />
                        <Button variant="contained" onClick={() => { void handleSaveProfile(); }} disabled={savingProfile}>
                            {savingProfile ? "Opslaan..." : "Opslaan"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!isPublicView && (
                <Card sx={{ borderRadius: 3, mb: 2 }}>
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>
                            Publiek profiel openen
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                                fullWidth
                                size="small"
                                label="UID of username"
                                value={sharedLookup}
                                onChange={(event) => setSharedLookup(event.target.value)}
                            />
                            <Button variant="outlined" onClick={() => { void handleShareLookup(); }}>
                                Open
                            </Button>
                        </Stack>
                        {sharedProfile && (
                            <Button sx={{ mt: 1 }} variant="text" onClick={() => {
                                setSharedProfile(null);
                                setSharedReviews([]);
                            }}>
                                Terug naar mijn profiel
                            </Button>
                        )}
                        {profile && (
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                                Deelbaar profiel:
                                {" "}
                                <Link to={`/profiel/${profile.username || profile.uid}`}>
                                    {window.location.origin}/profiel/{profile.username || profile.uid}
                                </Link>
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                    {activeProfile ? (
                        <ProfileView activeProfile={activeProfile} reviews={activeReviews} />
                    ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            Geen profielgegevens beschikbaar.
                        </Typography>
                    )}
                </CardContent>
            </Card>

            <Button sx={{ mt: 2 }} variant="outlined" onClick={logout}>
                Uitloggen
            </Button>
        </section>
    );
}
