import * as React from 'react';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import CottageIcon from '@mui/icons-material/Cottage';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import SpaIcon from '@mui/icons-material/Spa';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <Box sx={{ width: '100%', position: 'fixed', bottom: 0 }}>
            <BottomNavigation
                showLabels
                value={location.pathname}
                onChange={(event, newValue) => {
                    navigate(`${newValue}`, { replace: true }); 
                }}
            >
                <BottomNavigationAction value={'/'} label="Home" icon={<CottageIcon />} />
                <BottomNavigationAction value={'/kaart'} label="Kaart" icon={<MapIcon />} />
                <BottomNavigationAction value={'/zoeken'} label="Zoeken" icon={<SearchIcon />} />
                <BottomNavigationAction value={'/cannabis'} label="Cannabis" icon={<SpaIcon />} />
            </BottomNavigation>
        </Box>
    );
}