import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  CircularProgress,
  Typography,
  Paper,
  makeStyles,
  InputAdornment,
  Chip
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import ReplyIcon from "@material-ui/icons/Reply";
import ImageIcon from "@material-ui/icons/Image";
import AudiotrackIcon from "@material-ui/icons/Audiotrack";
import VideocamIcon from "@material-ui/icons/Videocam";
import DescriptionIcon from "@material-ui/icons/Description";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    padding: theme.spacing(2),
    minWidth: 380,
    maxWidth: 550,
  },
  previewBox: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    backgroundColor: "#f0f2f5",
    borderRadius: 8,
    borderLeft: "4px solid #128c7e",
  },
  previewIcon: {
    marginRight: theme.spacing(1.5),
    color: "#128c7e",
  },
  previewText: {
    fontSize: "0.875rem",
    color: "#4a4a4a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 350,
  },
  searchField: {
    marginBottom: theme.spacing(2),
  },
  listContainer: {
    maxHeight: 320,
    overflowY: "auto",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
  },
  chipSelected: {
    margin: theme.spacing(0.5),
  },
  selectedContainer: {
    display: "flex",
    flexWrap: "wrap",
    marginBottom: theme.spacing(1.5),
    maxHeight: 70,
    overflowY: "auto",
  },
  forwardIconBadge: {
    transform: "scaleX(-1)",
    marginRight: 6,
  },
}));

const ForwardMessageModal = ({ open, onClose, message }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tickets, setTickets] = useState([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);

  useEffect(() => {
    if (open) {
      fetchTickets();
      setSelectedTicketIds([]);
      setSearchTerm("");
    }
  }, [open]);

  const fetchTickets = async (search = "") => {
    setLoading(true);
    try {
      const { data } = await api.get("/tickets", {
        params: {
          searchParam: search,
          pageNumber: 1,
          status: "open",
        },
      });
      setTickets(data.tickets || []);
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
      fetchTickets(value);
    }, 400);
    return () => clearTimeout(delayDebounce);
  };

  const handleToggleTicket = (ticketId) => {
    setSelectedTicketIds((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleForward = async () => {
    if (selectedTicketIds.length === 0) {
      toast.warning(i18n.t("forwardModal.noRecipients"));
      return;
    }

    setSending(true);
    try {
      await api.post("/messages/forward", {
        messageId: message.id,
        ticketIds: selectedTicketIds,
      });

      toast.success(i18n.t("forwardModal.success"));
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSending(false);
    }
  };

  const renderMediaIcon = () => {
    if (!message) return null;
    if (message.mediaType === "image") return <ImageIcon className={classes.previewIcon} />;
    if (message.mediaType === "video") return <VideocamIcon className={classes.previewIcon} />;
    if (message.mediaType === "audio" || message.mediaType === "ptt")
      return <AudiotrackIcon className={classes.previewIcon} />;
    if (message.mediaType === "document")
      return <DescriptionIcon className={classes.previewIcon} />;
    return <ReplyIcon className={`${classes.previewIcon} ${classes.forwardIconBadge}`} />;
  };

  if (!message) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{i18n.t("forwardModal.title")}</DialogTitle>
      <DialogContent className={classes.dialogContent} dividers>
        {/* Preview of message being forwarded */}
        <Paper elevation={0} className={classes.previewBox}>
          {renderMediaIcon()}
          <div>
            <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
              {message.mediaType && message.mediaType !== "chat"
                ? `Archivo (${message.mediaType.toUpperCase()})`
                : "Mensaje de texto"}
            </Typography>
            <Typography className={classes.previewText}>
              {message.body || "Archivo multimedia"}
            </Typography>
          </div>
        </Paper>

        <Typography variant="body2" color="textSecondary" gutterBottom>
          {i18n.t("forwardModal.subtitle")}
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder={i18n.t("forwardModal.searchPlaceholder")}
          value={searchTerm}
          onChange={handleSearchChange}
          className={classes.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* Selected Recipients Chips */}
        {selectedTicketIds.length > 0 && (
          <div className={classes.selectedContainer}>
            {selectedTicketIds.map((id) => {
              const ticket = tickets.find((t) => t.id === id);
              return (
                <Chip
                  key={id}
                  size="small"
                  label={ticket?.contact?.name || `Ticket #${id}`}
                  onDelete={() => handleToggleTicket(id)}
                  color="primary"
                  className={classes.chipSelected}
                />
              );
            })}
          </div>
        )}

        {/* Ticket / Contact List */}
        <div className={classes.listContainer}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
              <CircularProgress size={28} />
            </div>
          ) : tickets.length === 0 ? (
            <Typography
              variant="body2"
              color="textSecondary"
              align="center"
              style={{ padding: 20 }}
            >
              No se encontraron chats abiertos o coincidentes
            </Typography>
          ) : (
            <List dense disablePadding>
              {tickets.map((ticket) => {
                const isSelected = selectedTicketIds.includes(ticket.id);
                return (
                  <ListItem
                    key={ticket.id}
                    button
                    onClick={() => handleToggleTicket(ticket.id)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={ticket.contact?.profilePicUrl}
                        alt={ticket.contact?.name}
                      >
                        {ticket.contact?.name?.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={ticket.contact?.name || ticket.contact?.number}
                      secondary={
                        ticket.lastMessage
                          ? ticket.lastMessage.substring(0, 35) + "..."
                          : `Ticket #${ticket.id}`
                      }
                    />
                    <Checkbox
                      edge="end"
                      checked={isSelected}
                      color="primary"
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="default" disabled={sending}>
          Cancelar
        </Button>
        <Button
          onClick={handleForward}
          color="primary"
          variant="contained"
          disabled={sending || selectedTicketIds.length === 0}
          startIcon={
            sending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <ReplyIcon style={{ transform: "scaleX(-1)" }} />
            )
          }
        >
          {sending ? i18n.t("forwardModal.sending") : i18n.t("forwardModal.sendButton")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForwardMessageModal;
