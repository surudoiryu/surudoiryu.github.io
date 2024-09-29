import * as React from 'react';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import CottageIcon from '@mui/icons-material/Cottage';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import SpaIcon from '@mui/icons-material/Spa';

export default function BottomNav(props: any) {
    const { 
        currentPage, 
        setCurrentPage 
    } = props;

    return (
        <Box sx={{ width: '100%', position: 'fixed', bottom: 0 }}>
            <BottomNavigation
                showLabels
                value={currentPage}
                onChange={(event, newValue) => {
                    setCurrentPage(newValue);
                }}
            >
                <BottomNavigationAction value={'home'} label="Home" icon={<CottageIcon />} />
                <BottomNavigationAction value={'shops'} label="Shops" icon={<MapIcon />} />
                <BottomNavigationAction value={'search'} label="Zoeken" icon={<SearchIcon />} />
                <BottomNavigationAction value={'cannabis'} label="Cannabis" icon={<SpaIcon />} />
            </BottomNavigation>
        </Box>
    );
}