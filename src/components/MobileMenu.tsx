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

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const selectedPath = (() => {
        if (location.pathname.startsWith('/cannabis')) {
            return '/cannabis';
        }

        if (location.pathname.startsWith('/blog') || location.pathname.startsWith('/zoeken')) {
            return '/blog';
        }

        if (location.pathname.startsWith('/profiel') || location.pathname.startsWith('/login') || location.pathname.startsWith('/aanmelden')) {
            return user ? '/profiel' : '/login';
        }

        return location.pathname;
    })();

    return (
        <Box sx={{ width: '100%', position: 'fixed', bottom: 0 }}>
            <BottomNavigation
                showLabels
                value={selectedPath}
                onChange={(_, newValue) => {
                    navigate(`${newValue}`, { replace: true }); 
                }}
            >
                <BottomNavigationAction value={'/'} label="Home" icon={<CottageIcon />} />
                <BottomNavigationAction value={'/kaart'} label="Kaart" icon={<MapIcon />} />
                <BottomNavigationAction value={'/blog'} label="Blog" icon={<ArticleIcon />} />
                <BottomNavigationAction value={'/cannabis'} label="Cannabis" icon={<SpaIcon />} />
                <BottomNavigationAction value={user ? '/profiel' : '/login'} label={user ? 'Profiel' : 'Login'} icon={<PersonIcon />} />
            </BottomNavigation>
        </Box>
    );
}
