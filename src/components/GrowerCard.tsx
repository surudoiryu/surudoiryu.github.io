import React from "react";
import { GrowerType } from "../types/grower";
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import ShareIcon from '@mui/icons-material/Share';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Chip from '@mui/material/Chip';
import FaceIcon from '@mui/icons-material/Face';
import BoltIcon from '@mui/icons-material/Bolt';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import WeekendIcon from '@mui/icons-material/Weekend';
import ProductRating from "./Rating";

import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import CircleIcon from '@mui/icons-material/Circle';

type Props = {
    grower: GrowerType | undefined;
};

const GrowerCard = ({ grower }: Props) => {
    if(grower === undefined) return (<></>)

    return (
        <Card sx={{ height: '100%' }}>
            <CardHeader
                
            />
            <CardMedia
                component="img"
                height="120"
                image={grower.thumbnailUrl}
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