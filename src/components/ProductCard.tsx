import React from "react";
import { ProductType } from "../types/product";
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
    product: ProductType;
};

const ProductCard = ({ product }: Props) => {
    return (
        <Card sx={{height: '100%'}}>
            <CardHeader
                sx={{ textAlign: 'left' }}
                action={
                    <>
                        <IconButton aria-label="share">
                            <ShareIcon />
                        </IconButton>
                        <IconButton aria-label="add to favorites">
                            <FavoriteBorderIcon />
                        </IconButton>
                    </>
                }
                title={<ProductRating rating={product.rating} />}
            />
            <CardMedia
                component="img"
                height="230"
                image={product.thumbnailUrl}
                alt={product.title}
            />
            <CardContent sx={{ textAlign: 'left' }}>
                <Chip size="small" icon={<BoltIcon />} label="Sativa Dominant" variant="outlined" />
                
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {product.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {product.brand}
                </Typography>

                <br />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    THC {product.thc}% CBD {product.cbd}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {product.effects.map((effect) => {
                        return <><VolunteerActivismOutlinedIcon fontSize="small" /> {effect.name}</>
                    })}
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    {product.terpenes.map((terpene) => {
                        return <><CircleIcon fontSize="small" htmlColor="#ff0000" /> {terpene.name}</>
                    })}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default ProductCard;