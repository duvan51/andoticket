import React, { useState, useEffect, useContext, useRef } from "react";
import "emoji-mart/css/emoji-mart.css";
import { useParams } from "react-router-dom";
import { Picker } from "emoji-mart";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import CircularProgress from "@material-ui/core/CircularProgress";
import { green } from "@material-ui/core/colors";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import IconButton from "@material-ui/core/IconButton";
import MoreVert from "@material-ui/icons/MoreVert";
import MoodIcon from "@material-ui/icons/Mood";
import SendIcon from "@material-ui/icons/Send";
import CancelIcon from "@material-ui/icons/Cancel";
import ClearIcon from "@material-ui/icons/Clear";
import MicIcon from "@material-ui/icons/Mic";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import ScheduleIcon from "@material-ui/icons/Schedule";
import PhotoLibraryIcon from "@material-ui/icons/PhotoLibrary";
import {
  FormControlLabel,
  Hidden,
  Menu,
  MenuItem,
  Switch,
  Popover,
  Typography,
  Divider,
  Tooltip,
} from "@material-ui/core";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import AddIcon from "@material-ui/icons/Add";
import LockIcon from "@material-ui/icons/Lock";
import CreateIcon from "@material-ui/icons/Create";
import CloseIcon from "@material-ui/icons/Close";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import RecordingTimer from "./RecordingTimer";
import SchedulesModal from "../SchedulesModal";
import MediaGalleryModal from "../MediaGalleryModal";
import StorefrontIcon from "@material-ui/icons/Storefront";
import ExternalProductsModal from "../ExternalProductsModal";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import toastError from "../../errors/toastError";

let Mp3Recorder = null;

const initRecorder = async () => {
  if (!Mp3Recorder) {
    try {
      const MicRecorder = (await import("mic-recorder-to-mp3-fixed")).default;
      Mp3Recorder = new MicRecorder({ bitRate: 128 });
    } catch (error) {
      console.error("Failed to initialize recorder:", error);
      return null;
    }
  }
  return Mp3Recorder;
};

const useStyles = makeStyles(theme => ({
  mainWrapper: {
    background: "#eee",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
    width: "100%",
    boxSizing: "border-box",
  },

  newMessageBox: {
    background: "#eee",
    width: "100%",
    display: "flex",
    padding: "3px 4px",
    alignItems: "center",
    justifyContent: "space-between",
    boxSizing: "border-box",
  },

  messageInputWrapper: {
    padding: "4px 8px",
    marginRight: 4,
    marginLeft: 2,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    borderRadius: 20,
    flex: "1 1 auto",
    width: "100%",
    minWidth: 0,
    position: "relative",
    boxSizing: "border-box",
    transition: "border 0.2s ease, background-color 0.2s ease",
  },

  messageInputWrapperNote: {
    backgroundColor: "#fffde7 !important",
    border: "1.5px solid #ffe082 !important",
  },

  expandButton: {
    width: 38,
    height: 38,
    minWidth: 38,
    borderRadius: "50%",
    backgroundColor: "#e4e6eb",
    color: "#54656f",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    marginRight: 6,
    marginLeft: 2,
    "&:hover": {
      backgroundColor: "#d8dadf",
      color: "#111b21",
    },
  },

  expandButtonActive: {
    backgroundColor: "#1976d2 !important",
    color: "#ffffff !important",
    boxShadow: "0 2px 8px rgba(25, 118, 210, 0.35)",
  },

  expandButtonNote: {
    backgroundColor: "#ffe082",
    color: "#b78103",
  },

  expandIcon: {
    fontSize: 24,
    transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  },

  expandIconRotated: {
    transform: "rotate(45deg)",
  },

  expandablePopoverPaper: {
    borderRadius: 16,
    boxShadow: "0 12px 32px rgba(11, 20, 26, 0.16), 0 2px 8px rgba(11, 20, 26, 0.08)",
    border: "1px solid rgba(0, 0, 0, 0.08)",
    padding: "12px 14px",
    width: 310,
    maxWidth: "92vw",
    marginBottom: 10,
    overflow: "hidden",
  },

  trayHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    marginBottom: 4,
    borderBottom: "1px solid #f1f3f4",
  },

  trayTitle: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    color: "#80868b",
  },

  trayItemsList: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  trayRowItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "7px 8px",
    borderRadius: 10,
    cursor: "pointer",
    transition: "background-color 0.15s ease, transform 0.1s ease",
    "&:hover": {
      backgroundColor: "#f1f3f4",
      transform: "translateX(2px)",
    },
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
  },

  circleIndigo: {
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  },

  circlePink: {
    background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  },

  circleAmber: {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  },

  circleGreen: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },

  circleYellow: {
    background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
  },

  itemTexts: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  itemMainText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#202124",
    lineHeight: 1.3,
  },

  itemSubText: {
    fontSize: "11px",
    color: "#5f6368",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  toggleCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 8px",
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    cursor: "pointer",
    border: "1px solid #e8eaed",
    transition: "all 0.15s ease",
    "&:hover": {
      backgroundColor: "#f1f3f4",
    },
  },

  toggleCardActiveNote: {
    backgroundColor: "#fff8e1 !important",
    borderColor: "#ffe082 !important",
  },

  miniIconCircle: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    backgroundColor: "#e8eaed",
    color: "#5f6368",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  miniIconCircleActiveNote: {
    backgroundColor: "#ffe082 !important",
    color: "#b78103 !important",
  },

  miniIconCircleActiveSign: {
    backgroundColor: "#bbdefb !important",
    color: "#1976d2 !important",
  },

  toggleTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#202124",
    lineHeight: 1.2,
  },

  toggleSub: {
    fontSize: "10px",
    color: "#5f6368",
  },

  noteBadgeInline: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "#ffe082",
    color: "#b78103",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: "10px",
    fontWeight: 700,
    marginRight: 6,
    alignSelf: "center",
    whiteSpace: "nowrap",
  },

  messageInput: {
    paddingLeft: 6,
    flex: "1 1 auto",
    width: "100%",
    minWidth: 0,
    border: "none",
  },

  sendMessageIcons: {
    color: "grey",
  },

  uploadInput: {
    display: "none",
  },

  viewMediaInputWrapper: {
    display: "flex",
    padding: "10px 13px",
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eee",
    borderTop: "1px solid rgba(0, 0, 0, 0.12)",
  },

  emojiBox: {
    position: "absolute",
    bottom: 63,
    width: 40,
    borderTop: "1px solid #e8e8e8",
  },

  circleLoading: {
    color: green[500],
    opacity: "70%",
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -12,
  },

  audioLoading: {
    color: green[500],
    opacity: "70%",
  },

  recorderWrapper: {
    display: "flex",
    alignItems: "center",
    alignContent: "middle",
  },

  cancelAudioIcon: {
    color: "red",
  },

  sendAudioIcon: {
    color: "green",
  },

  replyginMsgWrapper: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingLeft: 73,
    paddingRight: 7,
  },

  replyginMsgContainer: {
    flex: 1,
    marginRight: 5,
    overflowY: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  replyginMsgBody: {
    padding: 10,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  replyginContactMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  replyginSelfMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#6bcbef",
  },

  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },
  switchLabel: {
    fontSize: "0.75rem",
  },
  messageQuickAnswersWrapper: {
    margin: 0,
    position: "absolute",
    bottom: "50px",
    background: "#ffffff",
    padding: "2px",
    border: "1px solid #CCC",
    left: 0,
    width: "100%",
    "& li": {
      listStyle: "none",
      "& a": {
        display: "block",
        padding: "8px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        maxHeight: "32px",
        "&:hover": {
          background: "#F1F1F1",
          cursor: "pointer",
        },
      },
    },
  },
}));

const MessageInput = ({ ticketStatus, ticket }) => {
  const classes = useStyles();
  const { ticketId } = useParams();

  const [medias, setMedias] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [quickAnswers, setQuickAnswer] = useState([]);
  const [typeBar, setTypeBar] = useState(false);
  const inputRef = useRef();
  const [anchorEl, setAnchorEl] = useState(null);
  const { setReplyingMessage, replyingMessage } =
    useContext(ReplyMessageContext);
  const { user } = useContext(AuthContext);

  const [signMessage, setSignMessage] = useLocalStorage("signOption", true);
  const [schedulesModalOpen, setSchedulesModalOpen] = useState(false);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [mediaGalleryModalOpen, setMediaGalleryModalOpen] = useState(false);

  useEffect(() => {
    inputRef.current.focus();
  }, [replyingMessage]);

  useEffect(() => {
    inputRef.current.focus();
    return () => {
      setInputMessage("");
      setShowEmoji(false);
      setMedias([]);
      setReplyingMessage(null);
    };
  }, [ticketId, setReplyingMessage]);

  const handleChangeInput = e => {
    setInputMessage(e.target.value);
    handleLoadQuickAnswer(e.target.value);
  };

  const handleQuickAnswersClick = async (qa) => {
    setInputMessage(qa.message || "");
    setTypeBar(false);

    if (qa.mediaPath) {
      setLoading(true);
      try {
        const response = await api.get(`/public/${qa.mediaPath}`, {
          responseType: "blob",
        });
        const file = new File([response.data], qa.mediaName || qa.mediaPath, {
          type: response.data.type,
        });
        setMedias([file]);
      } catch (err) {
        toastError(err);
      }
      setLoading(false);
    }
  };

  const handleAddEmoji = e => {
    let emoji = e.native;
    setInputMessage(prevState => prevState + emoji);
  };

  const handleSelectProduct = async (product) => {
    const title = (product.title || product.name || "").trim();
    const code = product.code ? `*Código:* ${product.code}\n` : "";
    const builtArea = product.built_area || product.lot_area || product.area;
    const area = builtArea ? `*Área:* ${builtArea} m²\n` : "";
    const description = product.description || product.body || "";
    const videoUrl = product.video_url || product.videoUrl || product.video;
    const videoText = videoUrl ? `\n🎥 *Video / Recorrido:* ${videoUrl}` : "";

    const productText = `*${title}*\n${code}${area}\n${description}${videoText}`.trim();
    setInputMessage(productText);

    const imageUrl = product.main_image || product.image || product.imageUrl || product.thumbnail;
    if (imageUrl) {
      setLoading(true);
      try {
        const response = await api.get("/settings/media-proxy", {
          params: { url: imageUrl },
          responseType: "blob",
        });
        const type = response.data.type || "image/png";
        const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
        const filename = `${(product.code || "producto").toLowerCase()}.${ext}`;
        const file = new File([response.data], filename, { type });
        setMedias([file]);
      } catch (err) {
        console.error("Error downloading product image via proxy", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChangeMedias = e => {
    if (!e.target.files) {
      return;
    }

    const selectedMedias = Array.from(e.target.files);
    setMedias(selectedMedias);
  };

  const handleInputPaste = e => {
    if (e.clipboardData.files[0]) {
      setMedias([e.clipboardData.files[0]]);
    }
  };

  const handleUploadMedia = async e => {
    setLoading(true);
    e.preventDefault();

    const formData = new FormData();
    formData.append("fromMe", true);
    if (replyingMessage) {
      formData.append("quotedMsg", JSON.stringify(replyingMessage));
    }
    medias.forEach(media => {
      formData.append("medias", media);
      formData.append("body", media.name);
    });

    try {
      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }

    setLoading(false);
    setMedias([]);
    setReplyingMessage(null);
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;
    setLoading(true);

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: isNote
        ? inputMessage.trim()
        : (signMessage ? `*${user?.name}:*\n${inputMessage.trim()}` : inputMessage.trim()),
      quotedMsg: replyingMessage,
      isNote: isNote,
    };
    try {
      await api.post(`/messages/${ticketId}`, message);
    } catch (err) {
      toastError(err);
    }

    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
    setIsNote(false);
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      const recorder = await initRecorder();
      if (!recorder) {
        throw new Error("Recorder not available");
      }
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await recorder.start();
      setRecording(true);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLoadQuickAnswer = async value => {
    if (value && value.indexOf("/") === 0) {
      try {
        const { data } = await api.get("/quickAnswers/", {
          params: { searchParam: inputMessage.substring(1) },
        });
        setQuickAnswer(data.quickAnswers);
        if (data.quickAnswers.length > 0) {
          setTypeBar(true);
        } else {
          setTypeBar(false);
        }
      } catch (err) {
        setTypeBar(false);
      }
    } else {
      setTypeBar(false);
    }
  };

  const handleFinishRecording = async () => {
    setLoading(true);
    try {
      const recorder = await initRecorder();
      if (!recorder) {
        throw new Error("Recorder not available");
      }
      const [, blob] = await recorder.stop().getMp3();
      if (blob.size < 500) {
        setLoading(false);
        setRecording(false);
        return;
      }

      const previewUrl = URL.createObjectURL(blob);
      setRecordedAudioBlob(blob);
      setAudioPreviewUrl(previewUrl);
    } catch (err) {
      toastError(err);
    }

    setRecording(false);
    setLoading(false);
  };

  const handleSendRecordedAudio = async () => {
    if (!recordedAudioBlob) return;
    setLoading(true);
    try {
      const formData = new FormData();
      const filename = `${new Date().getTime()}.mp3`;
      formData.append("medias", recordedAudioBlob, filename);
      formData.append("body", filename);
      formData.append("fromMe", true);

      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }

    setRecordedAudioBlob(null);
    setAudioPreviewUrl("");
    setLoading(false);
  };

  const handleCancelRecordedAudio = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setRecordedAudioBlob(null);
    setAudioPreviewUrl("");
  };

  const handleCancelAudio = async () => {
    try {
      const recorder = await initRecorder();
      if (recorder) {
        await recorder.stop().getMp3();
      }
      setRecording(false);
      handleCancelRecordedAudio();
    } catch (err) {
      toastError(err);
    }
  };

  const handleToggleMenu = event => {
    if (anchorEl) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleOpenFilePicker = () => {
    setAnchorEl(null);
    const fileInput = document.getElementById("upload-button");
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleOpenMediaGallery = () => {
    setAnchorEl(null);
    setMediaGalleryModalOpen(true);
  };

  const handleOpenSchedules = () => {
    setAnchorEl(null);
    setSchedulesModalOpen(true);
  };

  const handleOpenProducts = () => {
    setAnchorEl(null);
    setProductsModalOpen(true);
  };

  const handleToggleEmojis = () => {
    setAnchorEl(null);
    setShowEmoji(prev => !prev);
  };

  const renderReplyingMessage = message => {
    return (
      <div className={classes.replyginMsgWrapper}>
        <div className={classes.replyginMsgContainer}>
          <span
            className={clsx(classes.replyginContactMsgSideColor, {
              [classes.replyginSelfMsgSideColor]: !message.fromMe,
            })}
          ></span>
          <div className={classes.replyginMsgBody}>
            {!message.fromMe && (
              <span className={classes.messageContactName}>
                {message.contact?.name}
              </span>
            )}
            {message.body}
          </div>
        </div>
        <IconButton
          aria-label="showRecorder"
          component="span"
          disabled={loading || ticketStatus !== "open"}
          onClick={() => setReplyingMessage(null)}
        >
          <ClearIcon className={classes.sendMessageIcons} />
        </IconButton>
      </div>
    );
  };

  if (audioPreviewUrl)
    return (
      <Paper elevation={0} square className={classes.viewMediaInputWrapper}>
        <IconButton
          aria-label="cancel-audio-preview"
          component="span"
          onClick={handleCancelRecordedAudio}
          disabled={loading}
        >
          <HighlightOffIcon className={classes.cancelAudioIcon} />
        </IconButton>

        <audio src={audioPreviewUrl} controls style={{ flex: 1, height: 40, marginLeft: 8, marginRight: 8 }} />

        <IconButton
          aria-label="send-recorded-audio"
          component="span"
          onClick={handleSendRecordedAudio}
          disabled={loading}
        >
          <SendIcon className={classes.sendMessageIcons} />
        </IconButton>
      </Paper>
    );

  if (medias.length > 0) {
    const firstMedia = medias[0];
    const isImage = firstMedia?.type?.startsWith("image/");
    const isAudioMedia = firstMedia?.type?.startsWith("audio/");
    const isVideoMedia = firstMedia?.type?.startsWith("video/");
    const previewSrc = URL.createObjectURL(firstMedia);

    return (
      <Paper elevation={0} square className={classes.viewMediaInputWrapper}>
        <IconButton
          aria-label="cancel-upload"
          component="span"
          onClick={e => setMedias([])}
          disabled={loading}
        >
          <CancelIcon className={classes.sendMessageIcons} />
        </IconButton>

        {loading ? (
          <div>
            <CircularProgress className={classes.circleLoading} />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", flex: 1, overflow: "hidden", marginLeft: 8, marginRight: 8 }}>
            {isImage && (
              <img
                src={previewSrc}
                alt="preview"
                style={{ height: 50, maxWidth: 90, objectFit: "cover", borderRadius: 4, marginRight: 8 }}
              />
            )}
            {isAudioMedia && (
              <audio src={previewSrc} controls style={{ height: 40, flex: 1, marginRight: 8 }} />
            )}
            {isVideoMedia && (
              <video src={previewSrc} style={{ height: 50, maxWidth: 90, objectFit: "cover", borderRadius: 4, marginRight: 8 }} />
            )}
            <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {firstMedia.name}
            </span>
          </div>
        )}
        <IconButton
          aria-label="send-upload"
          component="span"
          onClick={handleUploadMedia}
          disabled={loading}
        >
          <SendIcon className={classes.sendMessageIcons} />
        </IconButton>
      </Paper>
    );
  }
  else {
    return (
      <Paper square elevation={0} className={classes.mainWrapper}>
        <SchedulesModal
          open={schedulesModalOpen}
          onClose={() => setSchedulesModalOpen(false)}
          initialValues={{
            body: inputMessage,
            contactId: ticket?.contactId,
            contact: ticket?.contact,
            ticketId: ticket?.id
          }}
          onSave={() => {
            setInputMessage("");
            setReplyingMessage(null);
            setIsNote(false);
          }}
        />
        <ExternalProductsModal
          open={productsModalOpen}
          onClose={() => setProductsModalOpen(false)}
          onSelect={handleSelectProduct}
        />
        <MediaGalleryModal
          open={mediaGalleryModalOpen}
          onClose={() => setMediaGalleryModalOpen(false)}
          ticketId={ticketId}
        />
        {replyingMessage && renderReplyingMessage(replyingMessage)}
        <div className={classes.newMessageBox}>
          {/* BOTON UNICO EXPANDIBLE */}
          <Tooltip title={Boolean(anchorEl) ? "Cerrar opciones" : "Adjuntar y mas opciones"}>
            <span>
              <IconButton
                aria-label="opciones-mensaje"
                className={clsx(classes.expandButton, {
                  [classes.expandButtonActive]: Boolean(anchorEl),
                  [classes.expandButtonNote]: isNote && !Boolean(anchorEl),
                })}
                onClick={handleToggleMenu}
                disabled={loading || recording || ticketStatus !== "open"}
                size="small"
              >
                <AddIcon
                  className={clsx(classes.expandIcon, {
                    [classes.expandIconRotated]: Boolean(anchorEl),
                  })}
                />
              </IconButton>
            </span>
          </Tooltip>

          {/* MENU FLOTANTE EXPANDIBLE BIEN BONITO */}
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleCloseMenu}
            anchorOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            classes={{ paper: classes.expandablePopoverPaper }}
            elevation={4}
          >
            <div className={classes.trayHeader}>
              <Typography variant="caption" className={classes.trayTitle}>
                Herramientas y Archivos
              </Typography>
              <IconButton size="small" onClick={handleCloseMenu} style={{ padding: 2 }}>
                <CloseIcon style={{ fontSize: 16, color: "#9ca3af" }} />
              </IconButton>
            </div>

            <div className={classes.trayItemsList}>
              {/* 1. Adjuntar Archivo */}
              <div className={classes.trayRowItem} onClick={handleOpenFilePicker}>
                <div className={clsx(classes.iconCircle, classes.circleIndigo)}>
                  <AttachFileIcon style={{ fontSize: 20 }} />
                </div>
                <div className={classes.itemTexts}>
                  <div className={classes.itemMainText}>Adjuntar Archivo</div>
                  <div className={classes.itemSubText}>Documentos, fotos, videos</div>
                </div>
              </div>

              {/* 2. Galeria Multimedia */}
              {ticket && ticket.id && (
                <div className={classes.trayRowItem} onClick={handleOpenMediaGallery}>
                  <div className={clsx(classes.iconCircle, classes.circlePink)}>
                    <PhotoLibraryIcon style={{ fontSize: 20 }} />
                  </div>
                  <div className={classes.itemTexts}>
                    <div className={classes.itemMainText}>Galeria Multimedia</div>
                    <div className={classes.itemSubText}>Imagenes y audios guardados</div>
                  </div>
                </div>
              )}

              {/* 3. Programar Cita / Mensaje */}
              {ticket && ticket.id && (
                <div className={classes.trayRowItem} onClick={handleOpenSchedules}>
                  <div className={clsx(classes.iconCircle, classes.circleAmber)}>
                    <ScheduleIcon style={{ fontSize: 20 }} />
                  </div>
                  <div className={classes.itemTexts}>
                    <div className={classes.itemMainText}>Programar Cita / Mensaje</div>
                    <div className={classes.itemSubText}>Envio programado en fecha y hora</div>
                  </div>
                </div>
              )}

              {/* 4. Catalogo de Productos */}
              {ticket && ticket.id && (
                <div className={classes.trayRowItem} onClick={handleOpenProducts}>
                  <div className={clsx(classes.iconCircle, classes.circleGreen)}>
                    <StorefrontIcon style={{ fontSize: 20 }} />
                  </div>
                  <div className={classes.itemTexts}>
                    <div className={classes.itemMainText}>Catalogo de Productos</div>
                    <div className={classes.itemSubText}>Buscar y enviar fichas de venta</div>
                  </div>
                </div>
              )}

              {/* 5. Emojis y Stickers */}
              <div className={classes.trayRowItem} onClick={handleToggleEmojis}>
                <div className={clsx(classes.iconCircle, classes.circleYellow)}>
                  <MoodIcon style={{ fontSize: 20 }} />
                </div>
                <div className={classes.itemTexts}>
                  <div className={classes.itemMainText}>Emojis y Stickers</div>
                  <div className={classes.itemSubText}>Panel de emoticones y simbolos</div>
                </div>
              </div>
            </div>

            <Divider style={{ margin: "10px 0 8px 0" }} />

            <div className={classes.optionsContainer}>
              {/* Modo Nota Interna */}
              <div
                className={clsx(classes.toggleCard, {
                  [classes.toggleCardActiveNote]: isNote,
                })}
                onClick={() => setIsNote(!isNote)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <div
                    className={clsx(classes.miniIconCircle, {
                      [classes.miniIconCircleActiveNote]: isNote,
                    })}
                  >
                    <LockIcon style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <div className={classes.toggleTitle}>Nota Interna (Privada)</div>
                    <div className={classes.toggleSub}>
                      {isNote ? "Activa: Solo tu equipo la vera" : "El cliente no la recibira"}
                    </div>
                  </div>
                </div>
                <Switch
                  size="small"
                  checked={isNote}
                  onChange={(e) => setIsNote(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  color="secondary"
                />
              </div>

              {/* Firmar Mensaje */}
              <div
                className={classes.toggleCard}
                onClick={() => setSignMessage(!signMessage)}
                style={{ marginTop: 4 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <div
                    className={clsx(classes.miniIconCircle, {
                      [classes.miniIconCircleActiveSign]: signMessage,
                    })}
                  >
                    <CreateIcon style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <div className={classes.toggleTitle}>Firmar Mensaje</div>
                    <div className={classes.toggleSub}>
                      {signMessage ? `Firmado por ${user?.name || "Asesor"}` : "Sin firma de asesor"}
                    </div>
                  </div>
                </div>
                <Switch
                  size="small"
                  checked={signMessage}
                  onChange={(e) => setSignMessage(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  color="primary"
                />
              </div>
            </div>
          </Popover>

          {/* INPUT PARA SUBIR ARCHIVOS (OCULTO) */}
          <input
            multiple
            type="file"
            id="upload-button"
            disabled={loading || recording || ticketStatus !== "open"}
            className={classes.uploadInput}
            onChange={handleChangeMedias}
          />

          {/* EMOJI PICKER FLOTANTE */}
          {showEmoji ? (
            <div className={classes.emojiBox}>
              <ClickAwayListener onClickAway={() => setShowEmoji(false)}>
                <Picker
                  perLine={16}
                  showPreview={false}
                  showSkinTones={false}
                  onSelect={handleAddEmoji}
                />
              </ClickAwayListener>
            </div>
          ) : null}

          <div
            className={clsx(classes.messageInputWrapper, {
              [classes.messageInputWrapperNote]: isNote,
            })}
          >
            {isNote && (
              <div className={classes.noteBadgeInline}>
                <LockIcon style={{ fontSize: 12, marginRight: 3 }} />
                <span>NOTA INTERNA</span>
                <IconButton
                  size="small"
                  onClick={() => setIsNote(false)}
                  style={{ padding: 1, marginLeft: 3, color: "#b78103" }}
                  title="Desactivar nota"
                >
                  <ClearIcon style={{ fontSize: 12 }} />
                </IconButton>
              </div>
            )}
            <InputBase
              inputRef={input => {
                input && input.focus();
                input && (inputRef.current = input);
              }}
              className={classes.messageInput}
              placeholder={
                isNote
                  ? "Escribe una nota interna (sólo visible para la empresa)..."
                  : (ticketStatus === "open"
                    ? i18n.t("messagesInput.placeholderOpen")
                    : i18n.t("messagesInput.placeholderClosed"))
              }
              multiline
              maxRows={5}
              value={inputMessage}
              onChange={handleChangeInput}
              disabled={recording || loading || ticketStatus !== "open"}
              onPaste={e => {
                ticketStatus === "open" && handleInputPaste(e);
              }}
              onKeyPress={e => {
                if (loading || e.shiftKey) return;
                else if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />
            {typeBar ? (
              <ul className={classes.messageQuickAnswersWrapper}>
                {quickAnswers.map((value, index) => {
                  return (
                    <li
                      className={classes.messageQuickAnswersWrapperItem}
                      key={index}
                    >
                      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                      <a onClick={() => handleQuickAnswersClick(value)}>
                        {`${value.shortcut} - ${value.message || value.mediaName || "Archivo"}${value.mediaPath ? " 📎" : ""}`}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div></div>
            )}
          </div>
          {inputMessage ? (
            <>
              <IconButton
                aria-label="sendMessage"
                component="span"
                onClick={handleSendMessage}
                disabled={loading}
              >
                <SendIcon className={classes.sendMessageIcons} />
              </IconButton>
            </>
          ) : recording ? (
            <div className={classes.recorderWrapper}>
              <IconButton
                aria-label="cancelRecording"
                component="span"
                fontSize="large"
                disabled={loading}
                onClick={handleCancelAudio}
              >
                <HighlightOffIcon className={classes.cancelAudioIcon} />
              </IconButton>
              {loading ? (
                <div>
                  <CircularProgress className={classes.audioLoading} />
                </div>
              ) : (
                <RecordingTimer />
              )}

              <IconButton
                aria-label="sendRecordedAudio"
                component="span"
                onClick={handleFinishRecording}
                disabled={loading}
              >
                <CheckCircleOutlineIcon className={classes.sendAudioIcon} />
              </IconButton>
            </div>
          ) : (
            <IconButton
              aria-label="showRecorder"
              component="span"
              disabled={loading || ticketStatus !== "open"}
              onClick={handleStartRecording}
            >
              <MicIcon className={classes.sendMessageIcons} />
            </IconButton>
          )}
        </div>
      </Paper>
    );
  }
};

export default MessageInput;
