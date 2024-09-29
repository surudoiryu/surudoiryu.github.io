import React from "react";
import Rating, { IconContainerProps } from '@mui/material/Rating';
import { styled } from '@mui/material/styles';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAltOutlined';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';

const StyledRating = styled(Rating)(({ theme }) => ({
    '& .MuiRating-iconEmpty .MuiSvgIcon-root': {
        color: theme.palette.action.disabled,
    },
}));

const customIcons: RatingProps = {
    1: {
        icon: <SentimentVeryDissatisfiedIcon color="error" />,
        label: 'Very Dissatisfied',
    },
    2: {
        icon: <SentimentDissatisfiedIcon color="error" />,
        label: 'Dissatisfied',
    },
    3: {
        icon: <SentimentSatisfiedIcon color="warning" />,
        label: 'Neutral',
    },
    4: {
        icon: <SentimentSatisfiedAltIcon color="success" />,
        label: 'Satisfied',
    },
    5: {
        icon: <SentimentVerySatisfiedIcon color="success" />,
        label: 'Very Satisfied',
    }
};

const IconContainer = (props: IconContainerProps) => {
    const { value, ...other } = props
    return <span {...other}>{customIcons[value].icon}</span>
}
type RatingProps = {
    [key: number]: RatingProp
}

type RatingProp = {
    icon: JSX.Element;
    label: string;
}

type Props = {
    rating: number;
};

const ProductRating = ({ rating }: Props) => {
    return (
        <StyledRating
            name="highlight-selected-only"
            defaultValue={5}
            getLabelText={(value: number) => customIcons[value].label}
            IconContainerComponent={IconContainer}
            readOnly
            highlightSelectedOnly
        />
    )
};

export default ProductRating;