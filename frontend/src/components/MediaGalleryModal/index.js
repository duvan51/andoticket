import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Typography,
  makeStyles,
  Grid,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Checkbox,
  InputAdornment,
  Chip,
  Box,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import PhotoLibraryIcon from "@material-ui/icons/PhotoLibrary";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import SendIcon from "@material-ui/icons/Send";
import ImageIcon from "@material-ui/icons/Image";
import VideocamIcon from "@material-ui/icons/Videocam";
import AudiotrackIcon from "@material-ui/icons/Audiotrack";
import DescriptionIcon from "@material-ui/icons/Description";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    padding: theme.spacing(2),
    minWidth: 500,
    maxHeight: "75vh",
  },
  searchBar: {
    marginBottom: theme.spacing(1.5),
  },
  tabsContainer: {
    marginBottom: theme.spacing(2),
    borderBottom: "1px solid #e0e0e0",
  },
  card: {
    position: "relative",
    borderRadius: 8,
    border: "2px solid transparent",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
  },
  cardSelected: {
    borderColor: "#128c7e",
    backgroundColor: "#f0f8f6",
  },
  cardMedia: {
    height: 120,
    backgroundColor: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    objectFit: "cover",
  },
  checkIcon: {
    position: "absolute",
    top: 6,
    right: 6,
    color: "#128c7e",
    backgroundColor: "#fff",
    borderRadius: "50%",
    zIndex: 2,
  },
  typeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    color: "#fff",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: "0.7rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 3,
    zIndex: 2,
  },
  cardTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardCaption: {
    fontSize: "0.75rem",
    color: "#666",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  captionInput: {
    marginTop: theme.spacing(2),
  },
  emptyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(6),
    color: "#888",
  },
}));

const MediaGalleryModal = ({ open, onClose, ticketId }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [customCaption, setCustomCaption] = useState("");

  useEffect(() => {
    if (open) {
      fetchMedia();
      setSelectedIds([]);
      setCustomCaption("");
    }
  }, [open, activeTab]);

  const fetchMedia = async (search = searchTerm) => {
    setLoading(true);
    try {
      const { data } = await api.get("/media-gallery", {
        params: {
          searchParam: search,
          mediaType: activeTab,
          pageNumber: 1,
        },
      });
      setRecords(data.records || []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const delayDebounce = setTimeout(() => {
      fetchMedia(value);
    }, 400);
    return () => clearTimeout(delayDebounce);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleToggleSelect = (item) => {
    setSelectedIds((prev) => {
      if (prev.includes(item.id)) {
        const next = prev.filter((id) => id !== item.id);
        if (next.length === 0) setCustomCaption("");
        return next;
      } else {
        const next = [...prev, item.id];
        if (item.caption && !customCaption) {
          setCustomCaption(item.caption);
        }
        return next;
      }
    });
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      toast.warning(i18n.t("mediaGallery.pickerModal.noSelection"));
      return;
    }

    setSending(true);
    try {
      await api.post(`/media-gallery/send/${ticketId}`, {
        mediaIds: selectedIds,
        customCaption: customCaption.trim() || undefined,
      });

      toast.success(i18n.t("mediaGallery.pickerModal.success"));
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSending(false);
    }
  };

  const getMediaUrl = (item) => {
    if (!item || !item.mediaUrl) return "";
    if (item.mediaUrl.startsWith("http://") || item.mediaUrl.startsWith("https://")) {
      return item.mediaUrl;
    }
    const rawBase = getBackendUrl();
    const baseUrl = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
    const cleanPath = item.mediaUrl.startsWith("/") ? item.mediaUrl.slice(1) : item.mediaUrl;
    return `${baseUrl}/public/${cleanPath}`;
  };

  const renderMediaThumbnail = (item) => {
    const url = getMediaUrl(item);
    if (item.mediaType === "image") {
      return (
        <div className={classes.cardMedia}>
          <img
            src={url}
            alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        </div>
      );
    }
    if (item.mediaType === "video") {
      return (
        <div className={classes.cardMedia}>
          <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      );
    }
    if (item.mediaType === "audio") {
      return (
        <div className={classes.cardMedia}>
          <AudiotrackIcon style={{ fontSize: 44, color: "#128c7e" }} />
        </div>
      );
    }
    return (
      <div className={classes.cardMedia}>
        <DescriptionIcon style={{ fontSize: 44, color: "#546e7a" }} />
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PhotoLibraryIcon style={{ color: "#128c7e", marginRight: 8 }} />
          <span>{i18n.t("mediaGallery.pickerModal.title")}</span>
        </Box>
      </DialogTitle>
      <DialogContent className={classes.dialogContent} dividers>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder={i18n.t("mediaGallery.pickerModal.searchPlaceholder")}
          value={searchTerm}
          onChange={handleSearchChange}
          className={classes.searchBar}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          className={classes.tabsContainer}
        >
          <Tab label={i18n.t("mediaGallery.tabs.all")} value="all" />
          <Tab label={i18n.t("mediaGallery.tabs.images")} value="image" />
          <Tab label={i18n.t("mediaGallery.tabs.videos")} value="video" />
          <Tab label={i18n.t("mediaGallery.tabs.audios")} value="audio" />
          <Tab label={i18n.t("mediaGallery.tabs.documents")} value="document" />
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" padding={6}>
            <CircularProgress />
          </Box>
        ) : records.length === 0 ? (
          <div className={classes.emptyBox}>
            <PhotoLibraryIcon style={{ fontSize: 56, marginBottom: 8, opacity: 0.5 }} />
            <Typography variant="body1">No se encontraron archivos en la galería</Typography>
          </div>
        ) : (
          <Grid container spacing={2}>
            {records.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <Grid item xs={6} sm={4} md={3} key={item.id}>
                  <Card
                    className={`${classes.card} ${isSelected ? classes.cardSelected : ""}`}
                    onClick={() => handleToggleSelect(item)}
                  >
                    <CardActionArea>
                      <div className={classes.typeBadge}>
                        {item.mediaType === "image" && <ImageIcon style={{ fontSize: 13 }} />}
                        {item.mediaType === "video" && <VideocamIcon style={{ fontSize: 13 }} />}
                        {item.mediaType === "audio" && <AudiotrackIcon style={{ fontSize: 13 }} />}
                        {item.mediaType === "document" && <DescriptionIcon style={{ fontSize: 13 }} />}
                        {item.mediaType.toUpperCase()}
                      </div>
                      {isSelected && <CheckCircleIcon className={classes.checkIcon} />}
                      {renderMediaThumbnail(item)}
                      <CardContent style={{ padding: "8px 10px" }}>
                        <Typography className={classes.cardTitle}>{item.title}</Typography>
                        {item.caption && (
                          <Typography className={classes.cardCaption}>
                            {item.caption}
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {selectedIds.length > 0 && (
          <TextField
            fullWidth
            label={i18n.t("mediaGallery.pickerModal.captionLabel")}
            variant="outlined"
            size="small"
            multiline
            rows={2}
            value={customCaption}
            onChange={(e) => setCustomCaption(e.target.value)}
            className={classes.captionInput}
            placeholder="Escribe un mensaje que acompañará al archivo seleccionado..."
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="default" disabled={sending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSend}
          color="primary"
          variant="contained"
          disabled={sending || selectedIds.length === 0}
          startIcon={
            sending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SendIcon />
            )
          }
        >
          {sending
            ? i18n.t("mediaGallery.pickerModal.sending")
            : `${i18n.t("mediaGallery.pickerModal.sendBtn")} (${selectedIds.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaGalleryModal;
