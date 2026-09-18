import React, { useState, useEffect, useReducer, useContext } from "react";
import openSocket from "../../services/socket-io";

import {
  Button,
  IconButton,
  makeStyles,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  InputAdornment,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@material-ui/core";
import { Edit, DeleteOutline, Visibility as VisibilityIcon } from "@material-ui/icons";
import SearchIcon from "@material-ui/icons/Search";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import QuickAnswersModal from "../../components/QuickAnswersModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import ModalImageCors from "../../components/ModalImageCors";
import Audio from "../../components/Audio";
import { getBackendUrl } from "../../config";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_QUICK_ANSWERS") {
    const quickAnswers = action.payload;
    const newQuickAnswers = [];

    quickAnswers.forEach((quickAnswer) => {
      const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswer.id);
      if (quickAnswerIndex !== -1) {
        state[quickAnswerIndex] = quickAnswer;
      } else {
        newQuickAnswers.push(quickAnswer);
      }
    });

    return [...state, ...newQuickAnswers];
  }

  if (action.type === "UPDATE_QUICK_ANSWERS") {
    const quickAnswer = action.payload;
    const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswer.id);

    if (quickAnswerIndex !== -1) {
      state[quickAnswerIndex] = quickAnswer;
      return [...state];
    } else {
      return [quickAnswer, ...state];
    }
  }

  if (action.type === "DELETE_QUICK_ANSWERS") {
    const quickAnswerId = action.payload;

    const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswerId);
    if (quickAnswerIndex !== -1) {
      state.splice(quickAnswerIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const QuickAnswers = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [quickAnswers, dispatch] = useReducer(reducer, []);
  const [selectedQuickAnswers, setSelectedQuickAnswers] = useState(null);
  const [quickAnswersModalOpen, setQuickAnswersModalOpen] = useState(false);
  const [deletingQuickAnswers, setDeletingQuickAnswers] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchQuickAnswers = async () => {
        try {
          const { data } = await api.get("/quickAnswers/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_QUICK_ANSWERS", payload: data.quickAnswers });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchQuickAnswers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("quickAnswer", (data) => {
      if (data.action === "update" || data.action === "create") {
        const { quickAnswer } = data;
        if (
          quickAnswer.companyId === user.companyId &&
          (quickAnswer.userId === null || quickAnswer.userId === user.id)
        ) {
          dispatch({ type: "UPDATE_QUICK_ANSWERS", payload: quickAnswer });
        }
      }

      if (data.action === "delete") {
        dispatch({
          type: "DELETE_QUICK_ANSWERS",
          payload: +data.quickAnswerId,
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenQuickAnswersModal = () => {
    setSelectedQuickAnswers(null);
    setQuickAnswersModalOpen(true);
  };

  const handleCloseQuickAnswersModal = () => {
    setSelectedQuickAnswers(null);
    setQuickAnswersModalOpen(false);
  };

  const handleEditQuickAnswers = (quickAnswer) => {
    setSelectedQuickAnswers(quickAnswer);
    setQuickAnswersModalOpen(true);
  };

  const handleDeleteQuickAnswers = async (quickAnswerId) => {
    try {
      await api.delete(`/quickAnswers/${quickAnswerId}`);
      toast.success(i18n.t("quickAnswers.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingQuickAnswers(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingQuickAnswer, setViewingQuickAnswer] = useState(null);

  const handleOpenViewModal = (quickAnswer) => {
    setViewingQuickAnswer(quickAnswer);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewingQuickAnswer(null);
    setViewModalOpen(false);
  };

  const getMediaBadge = (quickAnswer) => {
    if (!quickAnswer.mediaPath) return "-";
    const ext = (quickAnswer.mediaPath || "").split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "🖼️ Imagen";
    if (["mp3", "ogg", "wav", "m4a", "aac", "opus"].includes(ext)) return "🎵 Audio";
    if (["mp4", "webm", "mkv", "avi"].includes(ext)) return "🎥 Video";
    return `📎 ${quickAnswer.mediaName || "Archivo"}`;
  };

  const renderMediaPreview = (quickAnswer) => {
    if (!quickAnswer || !quickAnswer.mediaPath) return null;
    const mediaPath = `/public/${quickAnswer.mediaPath}`;
    const ext = (quickAnswer.mediaPath || "").split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return (
        <div style={{ maxWidth: 280, maxHeight: 200, margin: "0 auto", display: "flex", justifyContent: "center" }}>
          <ModalImageCors imageUrl={mediaPath} />
        </div>
      );
    }

    if (["mp3", "ogg", "wav", "m4a", "aac", "opus"].includes(ext)) {
      return (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Audio url={mediaPath} />
        </div>
      );
    }

    if (["mp4", "webm", "mkv", "avi"].includes(ext)) {
      return (
        <video
          src={`${api.defaults.baseURL || ""}${mediaPath}`}
          controls
          style={{ width: 280, height: 160, borderRadius: 8, objectFit: "cover" }}
        />
      );
    }

    return (
      <Button
        size="small"
        variant="outlined"
        color="primary"
        component="a"
        href={`${api.defaults.baseURL || ""}${mediaPath}`}
        target="_blank"
        rel="noopener noreferrer"
        download={quickAnswer.mediaName || "archivo"}
      >
        📎 {quickAnswer.mediaName || "Descargar Archivo"}
      </Button>
    );
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingQuickAnswers &&
          `${i18n.t("quickAnswers.confirmationModal.deleteTitle")} ${
            deletingQuickAnswers.shortcut
          }?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteQuickAnswers(deletingQuickAnswers.id)}
      >
        {i18n.t("quickAnswers.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QuickAnswersModal
        open={quickAnswersModalOpen}
        onClose={handleCloseQuickAnswersModal}
        aria-labelledby="form-dialog-title"
        quickAnswerId={selectedQuickAnswers && selectedQuickAnswers.id}
      ></QuickAnswersModal>
      <Dialog
        open={viewModalOpen}
        onClose={handleCloseViewModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="view-dialog-title">
          Respuesta Rápida: {viewingQuickAnswer?.shortcut}
        </DialogTitle>
        <DialogContent dividers style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Typography variant="caption" color="textSecondary" display="block">
                Atajo:
              </Typography>
              <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                {viewingQuickAnswer?.shortcut}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" color="textSecondary" display="block">
                Tipo / Alcance:
              </Typography>
              <Typography
                variant="body2"
                style={{
                  fontWeight: 600,
                  color: viewingQuickAnswer?.userId ? "#2576d2" : "#2e7d32",
                  background: viewingQuickAnswer?.userId ? "#e3f2fd" : "#e8f5e9",
                  padding: "4px 10px",
                  borderRadius: 12,
                  display: "inline-block",
                }}
              >
                {viewingQuickAnswer?.userId ? "🔒 Personal (Privada)" : "👥 Grupo (Compartida)"}
              </Typography>
            </div>
          </div>

          {viewingQuickAnswer?.message && (
            <div>
              <Typography variant="caption" color="textSecondary" display="block">
                Mensaje:
              </Typography>
              <Typography variant="body1" style={{ whiteSpace: "pre-wrap", background: "#f9f9f9", padding: 12, borderRadius: 8 }}>
                {viewingQuickAnswer?.message}
              </Typography>
            </div>
          )}

          {viewingQuickAnswer?.mediaPath && (
            <div>
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
                Archivo Adjunto:
              </Typography>
              {renderMediaPreview(viewingQuickAnswer)}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {viewingQuickAnswer && ((viewingQuickAnswer.userId === user.id) || (user.profile === "admin")) && (
            <Button
              color="primary"
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => {
                const qa = viewingQuickAnswer;
                handleCloseViewModal();
                handleEditQuickAnswers(qa);
              }}
            >
              Editar
            </Button>
          )}
          <Button onClick={handleCloseViewModal} color="secondary" variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      <MainHeader>
        <Title>{i18n.t("quickAnswers.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("quickAnswers.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenQuickAnswersModal}
          >
            {i18n.t("quickAnswers.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">
                {i18n.t("quickAnswers.table.shortcut")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("quickAnswers.table.message")}
              </TableCell>
              <TableCell align="center">
                Adjunto
              </TableCell>
              <TableCell align="center">
                {i18n.t("quickAnswers.table.type")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("quickAnswers.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {quickAnswers.map((quickAnswer) => (
                <TableRow key={quickAnswer.id}>
                  <TableCell align="center">{quickAnswer.shortcut}</TableCell>
                  <TableCell align="center">
                    <div style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 auto" }}>
                      {quickAnswer.message || "-"}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    {getMediaBadge(quickAnswer)}
                  </TableCell>
                  <TableCell align="center">
                    {quickAnswer.userId
                      ? i18n.t("quickAnswers.table.personal")
                      : i18n.t("quickAnswers.table.group")}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenViewModal(quickAnswer)}
                      title="Ver contenido"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    {((quickAnswer.userId === user.id) || (user.profile === "admin")) ? (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleEditQuickAnswers(quickAnswer)}
                        >
                          <Edit />
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setConfirmModalOpen(true);
                            setDeletingQuickAnswers(quickAnswer);
                          }}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={5} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default QuickAnswers;
