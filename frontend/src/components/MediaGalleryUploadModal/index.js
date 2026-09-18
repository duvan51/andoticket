import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Typography,
  makeStyles,
  Box,
} from "@material-ui/core";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import ImageIcon from "@material-ui/icons/Image";
import VideocamIcon from "@material-ui/icons/Videocam";
import AudiotrackIcon from "@material-ui/icons/Audiotrack";
import DescriptionIcon from "@material-ui/icons/Description";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    padding: theme.spacing(2.5),
    minWidth: 380,
    maxWidth: 550,
  },
  dropZone: {
    border: "2px dashed #128c7e",
    borderRadius: 8,
    padding: theme.spacing(3),
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: "#f9fbfb",
    transition: "all 0.2s ease",
    marginBottom: theme.spacing(2.5),
    "&:hover": {
      backgroundColor: "#f0f8f6",
      borderColor: "#075e54",
    },
  },
  fileInput: {
    display: "none",
  },
  previewContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  previewMedia: {
    maxHeight: 200,
    maxWidth: "100%",
    borderRadius: 6,
    objectFit: "contain",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  textField: {
    marginBottom: theme.spacing(2),
  },
}));

const MediaGalleryUploadModal = ({ open, onClose, onUploadSuccess }) => {
  const classes = useStyles();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setTitle("");
    setCaption("");
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
      if (selectedFile.type.startsWith("image/") || selectedFile.type.startsWith("video/")) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning("Por favor selecciona un archivo");
      return;
    }

    if (!title.trim()) {
      toast.warning("Por favor ingresa un título para el archivo");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("files", file);
    formData.append("title", title.trim());
    formData.append("caption", caption.trim());

    try {
      await api.post("/media-gallery", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(i18n.t("mediaGallery.uploadModal.success"));
      if (onUploadSuccess) onUploadSuccess();
      handleClose();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const renderFilePreviewIcon = () => {
    if (!file) return null;
    if (file.type.startsWith("image/")) return <ImageIcon color="primary" />;
    if (file.type.startsWith("video/")) return <VideocamIcon color="primary" />;
    if (file.type.startsWith("audio/")) return <AudiotrackIcon color="primary" />;
    return <DescriptionIcon color="primary" />;
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{i18n.t("mediaGallery.uploadModal.title")}</DialogTitle>
      <DialogContent className={classes.dialogContent} dividers>
        <input
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          id="gallery-file-upload"
          type="file"
          className={classes.fileInput}
          onChange={handleFileChange}
        />
        <label htmlFor="gallery-file-upload">
          <Box className={classes.dropZone}>
            <CloudUploadIcon style={{ fontSize: 48, color: "#128c7e", marginBottom: 8 }} />
            <Typography variant="body1" style={{ fontWeight: 600, color: "#333" }}>
              {file ? "Cambiar archivo seleccionado" : "Haz clic aquí para seleccionar un archivo"}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Soporta Fotos (JPG, PNG, GIF), Videos (MP4, WebM), Audios (MP3, OGG) y Documentos (PDF, DOC)
            </Typography>
          </Box>
        </label>

        {file && (
          <div className={classes.previewContainer}>
            {previewUrl && file.type.startsWith("image/") && (
              <img src={previewUrl} alt="Preview" className={classes.previewMedia} />
            )}
            {previewUrl && file.type.startsWith("video/") && (
              <video src={previewUrl} controls className={classes.previewMedia} />
            )}
            <div className={classes.fileInfo}>
              {renderFilePreviewIcon()}
              <Typography variant="body2" style={{ fontWeight: 500 }}>
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </Typography>
            </div>
          </div>
        )}

        <TextField
          fullWidth
          label={i18n.t("mediaGallery.uploadModal.titleField")}
          variant="outlined"
          size="small"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={classes.textField}
          required
        />

        <TextField
          fullWidth
          label={i18n.t("mediaGallery.uploadModal.captionField")}
          variant="outlined"
          size="small"
          multiline
          rows={3}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Texto que acompañará automáticamente a este archivo cuando lo envíes a un cliente."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="default" disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleUpload}
          color="primary"
          variant="contained"
          disabled={loading || !file}
          startIcon={loading && <CircularProgress size={18} color="inherit" />}
        >
          {loading
            ? i18n.t("mediaGallery.uploadModal.uploading")
            : i18n.t("mediaGallery.uploadModal.saveBtn")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaGalleryUploadModal;
