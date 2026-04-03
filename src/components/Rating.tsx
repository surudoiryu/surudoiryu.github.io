import React from "react";
import Rating, { IconContainerProps } from '@mui/material/Rating';
import { styled } from '@mui/material/styles';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAltOutlined';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';

const StyledRating = styled(Rating)(({ theme }) => ({
    '& .MuiRating-iconEmpty .MuiSvgIcon-root': {
        color: theme.palette.action.disabled,
    },
}));

const customIcons: RatingProps = {
    1: {
        icon: SentimentVeryDissatisfiedIcon,
        color: "#d32f2f",
        label: 'Very Dissatisfied',
    },
    2: {
        icon: SentimentDissatisfiedIcon,
        color: "#e53935",
        label: 'Dissatisfied',
    },
    3: {
        icon: SentimentSatisfiedIcon,
        color: "#f57c00",
        label: 'Neutral',
    },
    4: {
        icon: SentimentSatisfiedAltIcon,
        color: "#43a047",
        label: 'Satisfied',
    },
    5: {
        icon: SentimentVerySatisfiedIcon,
        color: "#2e7d32",
        label: 'Very Satisfied',
    }
};

const fallbackIcon: RatingProp = {
    icon: SentimentNeutralIcon,
    color: "#9e9e9e",
    label: 'No Rating',
};

const normalizeRating = (value: number): number => {
    const rounded = Math.round(Number(value) || 0);
    return Math.min(5, Math.max(0, rounded));
};

type RatingProps = {
    [key: number]: RatingProp
}

type RatingProp = {
    icon: typeof SentimentNeutralIcon;
    color: string;
    label: string;
}

type Props = {
    rating: number;
};

const ProductRating = ({ rating }: Props) => {
    const normalized = normalizeRating(rating);
    const IconContainer = (props: IconContainerProps) => {
        const { value, ...other } = props;
        const item = customIcons[value] ?? fallbackIcon;
        const Icon = item.icon;
        const isActive = value === normalized;
        return (
            <span {...other}>
                <Icon htmlColor={isActive ? item.color : "#bdbdbd"} />
            </span>
        );
    };

    return (
        <StyledRating
            name="highlight-selected-only"
            defaultValue={normalized}
            value={normalized}
            getLabelText={(value: number) => (customIcons[value] ?? fallbackIcon).label}
            IconContainerComponent={IconContainer}
            readOnly
            highlightSelectedOnly
        />
    )
};

export default ProductRating;
