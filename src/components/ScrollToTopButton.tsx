import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Fab, Tooltip, useScrollTrigger, Zoom } from "@mui/material";

export default function ScrollToTopButton() {
  const visible = useScrollTrigger({ disableHysteresis: true, threshold: 500 });
  const scrollToTop = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return <Zoom in={visible}>
    <Tooltip title="Naar boven" placement="left">
      <Fab
        color="success"
        size="medium"
        aria-label="Terug naar boven"
        onClick={scrollToTop}
        sx={{ position: "fixed", right: { xs: 16, md: 28 }, bottom: { xs: 82, md: 28 }, zIndex: 1100, boxShadow: "0 8px 24px rgba(15,55,27,.3)" }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Tooltip>
  </Zoom>;
}
