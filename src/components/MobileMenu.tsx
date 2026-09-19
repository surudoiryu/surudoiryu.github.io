import * as React from 'react';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import CottageIcon from '@mui/icons-material/Cottage';
import MapIcon from '@mui/icons-material/Map';
import ArticleIcon from '@mui/icons-material/Article';
import SpaIcon from '@mui/icons-material/Spa';
import PersonIcon from '@mui/icons-material/Person';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery, useTheme } from '@mui/material';

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

    const selectedPath = (() => {
        if (location.pathname.startsWith('/cannabis')) {
            return '/cannabis';
        }

        if (location.pathname.startsWith('/info') || location.pathname.startsWith('/blog') || location.pathname.startsWith('/zoeken')) {
            return '/info';
        }

        if (location.pathname.startsWith('/profiel') || location.pathname.startsWith('/login') || location.pathname.startsWith('/aanmelden')) {
            return user ? '/profiel' : '/login';
        }

        return location.pathname;
    })();

    if (isDesktop) {
        return null;
    }

    return (
        <Box sx={{ width: '100%', position: 'fixed', bottom: 0 }}>
            <BottomNavigation
                showLabels
                value={selectedPath}
                onChange={(_, newValue) => {
                    navigate(`${newValue}`); 
                }}
                sx={{
                    overflow: "visible",
                    pb: 0.5,
                    "& .MuiBottomNavigationAction-root": {
                        minWidth: 0,
                        px: 0.5,
                        flex: 1,
                    },
                    "& .MuiBottomNavigationAction-root.Mui-selected": {
                        color: "success.main",
                    },
                }}
            >
                <BottomNavigationAction value={'/'} label="Home" icon={<CottageIcon />} />
                <BottomNavigationAction value={'/kaart'} label="Shops" icon={<MapIcon />} />
                <BottomNavigationAction
                    value={'/info'}
                    label="Info"
                    icon={<ArticleIcon />}
                    sx={{
                        minWidth: 76,
                        maxWidth: 76,
                        minHeight: 76,
                        flex: "0 0 auto",
                        position: "relative",
                        top: -11,
                        borderRadius: "999px",
                        mx: 0.35,
                        mb: -0.8,
                        backgroundColor: "#e8f5e9",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                        zIndex: 3,
                        "& .MuiSvgIcon-root": {
                            fontSize: 30,
                        },
                        "& .MuiBottomNavigationAction-label": {
                            fontWeight: 700,
                            fontSize: "0.72rem",
                        },
                        "&.Mui-selected": {
                            color: "success.main",
                            backgroundColor: "#c8e6c9",
                        },
                    }}
                />
                <BottomNavigationAction value={'/cannabis'} label="Cannabis" icon={<SpaIcon />} />
                <BottomNavigationAction value={user ? '/profiel' : '/login'} label={user ? 'Profiel' : 'Login'} icon={<PersonIcon />} />
            </BottomNavigation>
        </Box>
    );
}
