import React from "react";
import { useNavigate } from "react-router-dom";
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
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import CircleIcon from '@mui/icons-material/Circle';
import { GrowerType } from "../types/grower";

type Props = {
    product: ProductType;
};

const ProductCard = ({ product }: Props) => {
    const navigate = useNavigate();
    if (product === undefined) return (<></>)
    //const brand: GrowerType = product.brand as GrowerType


    const openProductPage = (product: ProductType) => {
        if (product) {
            navigate(`/cannabis/${product.shortcode}`, { replace: true });
        } else {
            console.log('Something went wrong with selecting a Cannabis Store')
        }
    }

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
                title={<ProductRating key={`productrating-${product.id}`} rating={product.rating} />}
            />
            <CardMedia
                component="img"
                height="230"
                image={product.thumbnailUrl}
                alt={product.title}
                sx={{ objectFit: "scale-down" }}
                onClick={() => openProductPage(product)}
            />
            <CardContent sx={{ textAlign: 'left' }} onClick={() => openProductPage(product)}>
                <Chip size="small" icon={<BoltIcon />} label={product.dominantTerpene.energic > 50 ? "Sativa Dominant" : (product.dominantTerpene.energic === product.dominantTerpene.relaxing ) ? "Hybrid" : "Indica Dominant"} variant="outlined" />
                <span style={{ float: "right", display: "inline-block" }} ><CircleIcon sx={{position: "relative", top: "5px"}} fontSize="small" htmlColor={product.dominantTerpene.color} /> {product.dominantTerpene.name}</span>
                
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {product.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {product.brand?.title}
                </Typography>

                <br />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    THC {product.thcMin}% - {product.thcMax}%<br />
                    CBD {product.cbdMin === 0 ? `< ${product.cbdMax}%` : `${product.cbdMin}% - ${product.cbdMax}%`}<br />
                    <br />
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    <span style={{ float: "left", display: "inline-block" }}><VolunteerActivismOutlinedIcon sx={{ position: "relative", top: "5px" }} fontSize="small" /> {product.dominantPositiveEffect.name}</span>
                    <span style={{ float: "right", display: "inline-block" }}><ThumbDownOffAltIcon sx={{ position: "relative", top: "5px" }} fontSize="small" /> {product.dominantNegativeEffect.name}</span>
                </Typography>
            </CardContent>
        </Card>
    );
};

export default ProductCard;