import React from "react";
import { useNavigate } from "react-router-dom";
import { GrowerType } from "../types/grower";
import { useSignedMediaUrl } from "../hooks/useSignedMediaUrl";
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';

type Props = {
    grower: GrowerType | undefined;
};

const GrowerCard = ({ grower }: Props) => {
    const navigate = useNavigate();
    const thumbnailUrl = useSignedMediaUrl(grower?.thumbnailUrl);
    if(grower === undefined) return (<></>)

    const openGrowerPage = (grower: GrowerType) => {
        if (grower) {
            navigate(`/telers/${grower.shortcode}`, { replace: true });
        } else {
            console.log('Something went wrong with selecting a Cannabis Grower')
        }
    }

    return (
        <Card sx={{ height: '100%' }} onClick={() => openGrowerPage(grower)}>
            <CardHeader
                
            />
            <CardMedia
                component="img"
                height="120"
                image={thumbnailUrl || grower.thumbnailUrl}
                alt={grower.title}
                sx={{ objectFit: "scale-down"}}
            />
            <CardContent sx={{ textAlign: 'left' }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {grower.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {grower.shortDescription}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default GrowerCard;
