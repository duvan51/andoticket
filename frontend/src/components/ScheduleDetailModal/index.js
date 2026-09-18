import React, { useContext } from "react";
import { useHistory } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  makeStyles,
  Grid,
  Divider,
} from "@material-ui/core";
import ChatIcon from "@material-ui/icons/Chat";
import EditIcon from "@material-ui/icons/Edit";
import CancelIcon from "@material-ui/icons/Cancel";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import BlockIcon from "@material-ui/icons/Block";
import CloseIcon from "@material-ui/icons/Close";
import AttachFileIcon from "@material-ui/icons/AttachFile";

import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  content: {
    padding: theme.spacing(2),
  },
  label: {
    fontWeight: "bold",
    color: "#555",
  },
  value: {
    marginBottom: theme.spacing(1.5),
  },
  statusChip: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 12,
    fontSize: "0.75rem",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  statusPending: {
    backgroundColor: "#e3f2fd",
    color: "#0d47a1",
  },
  statusSent: {
    backgroundColor: "#e8f5e9",
    color: "#1b5e20",
  },
  statusCancelled: {
    backgroundColor: "#eeeeee",
    color: "#616161",
  },
  statusDeleted: {
    backgroundColor: "#ffe0b2",
    color: "#e65100",
    textDecoration: "line-through",
  },
  statusNoShow: {
    backgroundColor: "#ffebee",
    color: "#c62828",
  },
  divider: {
    margin: theme.spacing(1.5, 0),
  },
  actionButton: {
    margin: theme.spacing(0.5),
  },
}));

const ScheduleDetailModal = ({
  open,
  onClose,
  schedule,
  onEdit,
  onStatusChange,
  onAddAnother,
}) => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);

  if (!schedule) return null;

  const handleGoToChat = async () => {
    try {
      const { data: ticket } = await api.post("/tickets", {
        contactId: schedule.contactId,
        userId: user.id,
        status: "open",
      });
      history.push(`/tickets/${ticket.id}`);
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/scheduled-messages/${schedule.id}`, {
        status: newStatus,
      });
      toast.success("Estado de la cita actualizado con éxito");
      if (onStatusChange) {
        onStatusChange();
      }
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const getStatusLabel = (status, sentAt) => {
    if (status === "cancelled") return "Cancelado";
    if (status === "deleted") return "Eliminado (Subrayado)";
    if (status === "no_show") return "Cliente no llegó";
    if (sentAt) return "Enviado";
    return "Pendiente / Agendado";
  };

  const getStatusClass = (status, sentAt) => {
    if (status === "cancelled") return classes.statusCancelled;
    if (status === "deleted") return classes.statusDeleted;
    if (status === "no_show") return classes.statusNoShow;
    if (sentAt) return classes.statusSent;
    return classes.statusPending;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Detalles del Agendamiento</DialogTitle>
      <DialogContent dividers className={classes.content}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" className={classes.label}>
              Cliente / Contacto:
            </Typography>
            <Typography variant="body1" className={classes.value}>
              {schedule.contact?.name || "Desconocido"} ({schedule.contact?.number || ""})
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" className={classes.label}>
              Tipo de Agendamiento:
            </Typography>
            <Typography variant="body1" className={classes.value}>
              {schedule.mediaType === "appointment" ? "📅 Cita / Reunión" : "💬 Mensaje de WhatsApp"}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" className={classes.label}>
              Fecha y Hora:
            </Typography>
            <Typography variant="body1" className={classes.value}>
              {schedule.sendAt
                ? format(parseISO(schedule.sendAt), "dd/MM/yyyy 'a las' HH:mm 'hs'")
                : ""}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" className={classes.label}>
              Estado:
            </Typography>
            <div className={classes.value}>
              <span
                className={`${classes.statusChip} ${getStatusClass(
                  schedule.status,
                  schedule.sentAt
                )}`}
              >
                {getStatusLabel(schedule.status, schedule.sentAt)}
              </span>
            </div>
          </Grid>

          <Grid item xs={12}>
            <Divider className={classes.divider} />
            <Typography variant="body2" className={classes.label}>
              Mensaje / Descripción:
            </Typography>
            <Typography
              variant="body1"
              className={classes.value}
              style={{ whiteSpace: "pre-wrap", background: "#f9f9f9", padding: 10, borderRadius: 4 }}
            >
              {schedule.body}
            </Typography>
          </Grid>

          {schedule.mediaUrl && (
            <Grid item xs={12}>
              <Typography variant="body2" className={classes.label}>
                Archivo Adjunto:
              </Typography>
              <div style={{ marginTop: 4 }}>
                {(() => {
                  const ext = schedule.mediaName ? schedule.mediaName.split('.').pop().toLowerCase() : "";
                  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
                  const isAudio = ["mp3", "ogg", "wav", "m4a", "aac", "opus"].includes(ext);
                  const isVideo = ["mp4", "3gp", "avi", "mov", "mkv"].includes(ext);

                  if (isImage) {
                    return (
                      <img
                        src={schedule.mediaUrl}
                        alt={schedule.mediaName}
                        style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4, marginTop: 8 }}
                      />
                    );
                  }

                  if (isAudio) {
                    return (
                      <audio
                        src={schedule.mediaUrl}
                        controls
                        style={{ width: "100%", marginTop: 8 }}
                      />
                    );
                  }

                  if (isVideo) {
                    return (
                      <video
                        src={schedule.mediaUrl}
                        controls
                        style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 4, marginTop: 8 }}
                      />
                    );
                  }

                  return (
                    <Button
                      variant="outlined"
                      color="primary"
                      href={schedule.mediaUrl}
                      target="_blank"
                      style={{ marginTop: 8 }}
                      startIcon={<AttachFileIcon />}
                    >
                      Descargar {schedule.mediaName || "Archivo"}
                    </Button>
                  );
                })()}
              </div>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div>
          <Button
            startIcon={<ChatIcon />}
            variant="contained"
            color="primary"
            className={classes.actionButton}
            onClick={handleGoToChat}
          >
            Ir al Chat
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            color="primary"
            className={classes.actionButton}
            onClick={() => {
              onAddAnother(schedule);
              onClose();
            }}
          >
            Nueva Cita
          </Button>
        </div>
        <div>
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            className={classes.actionButton}
            onClick={() => {
              onEdit(schedule);
              onClose();
            }}
            disabled={schedule.sentAt !== null}
          >
            Reagendar
          </Button>
          <Button
            startIcon={<CancelIcon />}
            variant="outlined"
            style={{ color: "#e65100", borderColor: "#ffe0b2" }}
            className={classes.actionButton}
            onClick={() => handleStatusChange("cancelled")}
            disabled={schedule.status === "cancelled"}
          >
            Cancelar Cita
          </Button>
          <Button
            startIcon={<BlockIcon />}
            variant="outlined"
            style={{ color: "#c62828", borderColor: "#ffebee" }}
            className={classes.actionButton}
            onClick={() => handleStatusChange("no_show")}
            disabled={schedule.status === "no_show"}
          >
            No Llegó
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            variant="outlined"
            style={{ color: "#757575", borderColor: "#eeeeee" }}
            className={classes.actionButton}
            onClick={() => handleStatusChange("deleted")}
            disabled={schedule.status === "deleted"}
          >
            Subrayar
          </Button>
          <Button
            startIcon={<CloseIcon />}
            onClick={onClose}
            className={classes.actionButton}
          >
            Cerrar
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleDetailModal;
