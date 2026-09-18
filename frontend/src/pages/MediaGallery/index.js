import React, { useState, useEffect } from "react";
import {
  makeStyles,
  Paper,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Box,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import GetAppIcon from "@material-ui/icons/GetApp";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import ImageIcon from "@material-ui/icons/Image";
import VideocamIcon from "@material-ui/icons/Videocam";
import AudiotrackIcon from "@material-ui/icons/Audiotrack";
import DescriptionIcon from "@material-ui/icons/Description";
import PhotoLibraryIcon from "@material-ui/icons/PhotoLibrary";
import VisibilityIcon from "@material-ui/icons/Visibility";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import ModalImageCors from "../../components/ModalImageCors";
import MediaGalleryUploadModal from "../../components/MediaGalleryUploadModal";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2.5),
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  searchBar: {
    maxWidth: 400,
  },
  tabsContainer: {
    marginBottom: theme.spacing(3),
    borderBottom: "1px solid #e0e0e0",
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
    },
  },
  cardMediaWrapper: {
    position: "relative",
    height: 180,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardMedia: {
    height: "100%",
    width: "100%",
    objectFit: "cover",
  },
  typeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    borderRadius: 4,
    padding: "3px 8px",
    fontSize: "0.75rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 4,
    zIndex: 2,
  },
  cardContent: {
    flexGrow: 1,
    padding: theme.spacing(1.5),
  },
  cardTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    marginBottom: 4,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardCaption: {
    fontSize: "0.8rem",
    color: "#555",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    marginBottom: 8,
    minHeight: 32,
  },
  cardMeta: {
    fontSize: "0.72rem",
    color: "#888",
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid #f0f0f0",
    paddingTop: 6,
    marginTop: 4,
  },
  cardActions: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 8px",
    borderTop: "1px solid #f0f0f0",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(8),
    color: "#888",
  },
  previewVideo: {
    width: "100%",
    maxHeight: 400,
    borderRadius: 8,
  },
}));

const MediaGallery = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");


  useEffect(() => {
    fetchMedia();
  }, [activeTab]);

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

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/media-gallery/${itemToDelete.id}`);
      toast.success(i18n.t("mediaGallery.toasts.deleted"));
      setRecords((prev) => prev.filter((r) => r.id !== itemToDelete.id));
    } catch (err) {
      toastError(err);
    } finally {
      setItemToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const handleOpenEdit = (item) => {
    setItemToEdit(item);
    setEditTitle(item.title || "");
    setEditCaption(item.caption || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!itemToEdit) return;
    if (!editTitle.trim()) {
      toast.warning("El título es obligatorio");
      return;
    }

    setSavingEdit(true);
    try {
      const { data } = await api.put(`/media-gallery/${itemToEdit.id}`, {
        title: editTitle.trim(),
        caption: editCaption.trim(),
      });

      toast.success(i18n.t("mediaGallery.toasts.updated"));
      setRecords((prev) =>
        prev.map((r) => (r.id === itemToEdit.id ? { ...r, ...data } : r))
      );
      setEditModalOpen(false);
    } catch (err) {
      toastError(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyLink = (item) => {
    const url = getMediaUrl(item);
    navigator.clipboard.writeText(url);
    toast.info("Enlace copiado al portapapeles");
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

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={i18n.t("mediaGallery.deleteTitle")}
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      >
        {i18n.t("mediaGallery.deleteMessage")}
      </ConfirmationModal>

      <MediaGalleryUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={() => fetchMedia()}
      />

      {/* Video Preview Modal */}
      <Dialog
        open={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Reproductor de Video</DialogTitle>
        <DialogContent>
          {previewVideoUrl && (
            <video src={previewVideoUrl} controls autoPlay className={classes.previewVideo} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVideoModalOpen(false)} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Title / Caption Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar Archivo de Galería</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Título"
            variant="outlined"
            size="small"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ marginBottom: 16 }}
            required
          />
          <TextField
            fullWidth
            label="Pie de mensaje / Descripción predeterminada"
            variant="outlined"
            size="small"
            multiline
            rows={3}
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} color="default" disabled={savingEdit}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveEdit}
            color="primary"
            variant="contained"
            disabled={savingEdit}
          >
            {savingEdit ? <CircularProgress size={20} /> : "Guardar Cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      <MainHeader>
        <Title>{i18n.t("mediaGallery.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("mediaGallery.searchPlaceholder")}
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            className={classes.searchBar}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => setUploadModalOpen(true)}
            startIcon={<CloudUploadIcon />}
          >
            {i18n.t("mediaGallery.uploadBtn")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
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
          <Box display="flex" justifyContent="center" padding={10}>
            <CircularProgress />
          </Box>
        ) : records.length === 0 ? (
          <div className={classes.emptyState}>
            <PhotoLibraryIcon style={{ fontSize: 72, marginBottom: 12, opacity: 0.4 }} />
            <Typography variant="h6" gutterBottom>
              {i18n.t("mediaGallery.empty")}
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setUploadModalOpen(true)}
              startIcon={<CloudUploadIcon />}
              style={{ marginTop: 12 }}
            >
              {i18n.t("mediaGallery.uploadBtn")}
            </Button>
          </div>
        ) : (
          <Grid container spacing={3}>
            {records.map((item) => {
              const url = getMediaUrl(item);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Card className={classes.card}>
                    <div className={classes.cardMediaWrapper}>
                      <div className={classes.typeBadge}>
                        {item.mediaType === "image" && <ImageIcon style={{ fontSize: 14 }} />}
                        {item.mediaType === "video" && <VideocamIcon style={{ fontSize: 14 }} />}
                        {item.mediaType === "audio" && <AudiotrackIcon style={{ fontSize: 14 }} />}
                        {item.mediaType === "document" && <DescriptionIcon style={{ fontSize: 14 }} />}
                        {item.mediaType.toUpperCase()}
                      </div>

                      {item.mediaType === "image" && (
                        <ModalImageCors
                          imageUrl={url}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            cursor: "pointer",
                          }}
                        />
                      )}

                      {item.mediaType === "video" && (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            position: "relative",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setPreviewVideoUrl(url);
                            setVideoModalOpen(true);
                          }}
                        >
                          <video src={url} className={classes.cardMedia} />
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              backgroundColor: "rgba(0,0,0,0.6)",
                              borderRadius: "50%",
                              padding: 8,
                              color: "#fff",
                              display: "flex",
                            }}
                          >
                            <VisibilityIcon />
                          </div>
                        </div>
                      )}

                      {item.mediaType === "audio" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: 10,
                            width: "100%",
                          }}
                        >
                          <AudiotrackIcon style={{ fontSize: 48, color: "#128c7e", marginBottom: 8 }} />
                          <audio src={url} controls style={{ width: "90%", height: 32 }} />
                        </div>
                      )}

                      {item.mediaType === "document" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: 10,
                          }}
                        >
                          <DescriptionIcon style={{ fontSize: 56, color: "#546e7a", marginBottom: 4 }} />
                          <Typography variant="caption" color="textSecondary">
                            Documento
                          </Typography>
                        </div>
                      )}
                    </div>

                    <CardContent className={classes.cardContent}>
                      <Typography className={classes.cardTitle} title={item.title}>
                        {item.title}
                      </Typography>
                      <Typography className={classes.cardCaption}>
                        {item.caption || "(Sin descripción predeterminada)"}
                      </Typography>

                      <div className={classes.cardMeta}>
                        <span>{formatFileSize(item.size)}</span>
                        <span>{format(parseISO(item.createdAt), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                    </CardContent>

                    <CardActions className={classes.cardActions}>
                      <div>
                        <Tooltip title="Editar título / pie de foto">
                          <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copiar enlace directo">
                          <IconButton size="small" onClick={() => handleCopyLink(item)}>
                            <FileCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Descargar archivo">
                          <IconButton
                            size="small"
                            component="a"
                            href={url}
                            target="_blank"
                            download
                          >
                            <GetAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                      <Tooltip title="Eliminar de galería">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => {
                            setItemToDelete(item);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>
    </MainContainer>
  );
};

export default MediaGallery;
