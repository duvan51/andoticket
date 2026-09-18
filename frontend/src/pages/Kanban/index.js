import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useHistory } from "react-router-dom";
import {
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  ButtonGroup
} from "@material-ui/core";
import {
  Chat as ChatIcon,
  Visibility as VisibilityIcon,
  ViewColumn as ViewColumnIcon,
  TableChart as TableChartIcon
} from "@material-ui/icons";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from "@material-ui/lab";
import { format, parseISO } from "date-fns";

import api from "../../services/api";
import Board from "react-trello";
import { i18n } from "../../translate/i18n";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import openSocket from "../../services/socket-io";
import QueueSelectTicket from "../../components/QueueSelectTicket";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: theme.spacing(1),
  },
  boardContainer: {
    flex: 1,
    overflow: "hidden",
  },
  customCard: {
    padding: "10px",
    margin: "8px 0",
    backgroundColor: "#fff",
    borderRadius: "5px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
    cursor: "grab",
    minWidth: "250px",
    maxWidth: "280px"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#303030"
  },
  cardBody: {
    fontSize: "12px",
    color: "#606060",
    marginTop: "5px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
    borderTop: "1px solid #f0f0f0",
    paddingTop: "5px"
  },
  contactNumber: {
    fontSize: "11px",
    color: "#909090"
  },
  actionButtons: {
    display: "flex",
    gap: "2px"
  },
  iconButton: {
    padding: "4px"
  }
}));

const formatDuration = (startStr, endStr) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end - start;
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "menos de 1 min";
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  return `${diffHours}h ${remMins}m`;
};

const getTimelineItems = (ticket) => {
  const items = [];
  
  if (ticket?.trackings) {
    ticket.trackings.forEach((t) => {
      items.push({
        type: "tracking",
        id: `tracking-${t.id}`,
        createdAt: t.createdAt,
        finishedAt: t.finishedAt,
        userId: t.userId,
        user: t.user,
      });
    });
  }

  if (ticket?.messages) {
    ticket.messages.forEach((m) => {
      if (m.mediaType === "note") {
        items.push({
          type: "note",
          id: `note-${m.id}`,
          createdAt: m.createdAt,
          body: m.body,
        });
      } else if (m.mediaType === "tag") {
        items.push({
          type: "tag",
          id: `tag-${m.id}`,
          createdAt: m.createdAt,
          body: m.body,
        });
      } else if (m.mediaType === "schedule_history") {
        items.push({
          type: "schedule_history",
          id: `schedule-${m.id}`,
          createdAt: m.createdAt,
          body: m.body,
        });
      }
    });
  }

  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const renderStatusBadge = (status) => {
  if (status === "pending") {
    return <span style={{ fontSize: "10px", backgroundColor: "#fff8e1", color: "#b78103", border: "1px solid #ffe082", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>🟡 Nuevo</span>;
  }
  if (status === "open") {
    return <span style={{ fontSize: "10px", backgroundColor: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>🟢 En Atención</span>;
  }
  if (status === "closed") {
    return <span style={{ fontSize: "10px", backgroundColor: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>🔴 Resuelto</span>;
  }
  return null;
};

const CustomCard = ({ id, title, description, label, metadata, style }) => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);

  const ticket = metadata?.ticket;

  const handleOpenChat = (e) => {
    e.stopPropagation();
    history.push(`/tickets/${ticket?.id}`);
  };

  const handleOpenDetails = (e) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleCloseDetails = () => {
    setOpen(false);
  };

  return (
    <>
      <div className={classes.customCard} style={style}>
        <div className={classes.cardHeader}>
          <span>{title}</span>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {renderStatusBadge(ticket?.status)}
            {label && (
              <span style={{ fontSize: "10px", backgroundColor: "#e0e0e0", padding: "2px 6px", borderRadius: "10px", color: "#606060" }}>
                {label}
              </span>
            )}
          </div>
        </div>
        <div className={classes.cardBody}>
          {description}
        </div>
        <div className={classes.cardFooter}>
          <span className={classes.contactNumber}>
            {ticket?.contact?.number}
          </span>
          <div className={classes.actionButtons}>
            <Tooltip title="Ver detalles">
              <IconButton size="small" onClick={handleOpenDetails} className={classes.iconButton}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ir al Chat">
              <IconButton size="small" onClick={handleOpenChat} className={classes.iconButton} color="primary">
                <ChatIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      <Dialog open={open} onClose={handleCloseDetails} fullWidth maxWidth="sm">
        <DialogTitle>Detalles del Lead & Proceso del Cliente</DialogTitle>
        <DialogContent dividers>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <Typography variant="subtitle2" color="textSecondary">Nombre:</Typography>
              <Typography variant="body1" style={{ marginBottom: "10px", fontWeight: 500 }}>{title}</Typography>
              
              <Typography variant="subtitle2" color="textSecondary">Estado Actual:</Typography>
              <div style={{ marginBottom: "10px" }}>{renderStatusBadge(ticket?.status)}</div>

              <Typography variant="subtitle2" color="textSecondary">Número:</Typography>
              <Typography variant="body1" style={{ marginBottom: "10px" }}>{ticket?.contact?.number}</Typography>
              
              {ticket?.contact?.email && (
                <>
                  <Typography variant="subtitle2" color="textSecondary">Email:</Typography>
                  <Typography variant="body1" style={{ marginBottom: "10px" }}>{ticket.contact.email}</Typography>
                </>
              )}
            </div>

            <div style={{ flex: 1, minWidth: "200px" }}>
              <Typography variant="subtitle2" color="textSecondary">Canal de Conexión:</Typography>
              <Typography variant="body1" style={{ marginBottom: "10px" }}>{label || "Sin canal"}</Typography>

              <Typography variant="subtitle2" color="textSecondary">Último Mensaje:</Typography>
              <Typography variant="body1" style={{ marginBottom: "10px" }}>{description}</Typography>

              {ticket && (
                <>
                  <Typography variant="subtitle2" color="textSecondary">Departamento / Cola:</Typography>
                  <QueueSelectTicket ticket={ticket} />
                </>
              )}
              
              <Typography variant="subtitle2" color="textSecondary">Etiquetas Actuales:</Typography>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                {ticket?.tags && ticket.tags.length > 0 ? (
                  ticket.tags.map((t) => (
                    <span key={t.id} style={{ fontSize: "10px", backgroundColor: t.color || "#e0e0e0", color: "#fff", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                      {t.name}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "11px", color: "#909090" }}>Sin etiquetas</span>
                )}
              </div>
            </div>
          </div>

          {ticket?.contact?.extraInfo && ticket?.contact?.extraInfo.length > 0 && (
            <div style={{ marginBottom: "20px", backgroundColor: "#f9f9f9", padding: "12px", borderRadius: "6px" }}>
              <Typography variant="subtitle1" style={{ fontWeight: "bold", marginBottom: "8px" }}>Campos Personalizados / Notas</Typography>
              {ticket.contact.extraInfo.map((info, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", borderBottom: "1px dashed #e0e0e0", paddingBottom: "4px" }}>
                  <Typography variant="body2" style={{ fontWeight: "500" }}>{info.name}:</Typography>
                  <Typography variant="body2">{info.value}</Typography>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            <Typography variant="subtitle1" style={{ fontWeight: "bold", marginBottom: "10px" }}>Historial del Proceso</Typography>
            {(() => {
              const timelineItems = getTimelineItems(ticket);
              if (timelineItems.length === 0) {
                return (
                  <Typography variant="body2" color="textSecondary" style={{ fontStyle: "italic" }}>
                    No hay historial registrado para este ticket.
                  </Typography>
                );
              }

              return (
                <Timeline align="left" style={{ padding: "0 10px" }}>
                  {timelineItems.map((item, idx) => {
                    const isLast = idx === timelineItems.length - 1;
                    const dateFormatted = format(parseISO(item.createdAt), "dd/MM/yyyy HH:mm");
                    
                    let contentText = "";
                    let dotBgColor = "#9e9e9e"; // grey
                    
                    if (item.type === "note") {
                      contentText = `Nota interna: "${item.body}"`;
                      dotBgColor = "#fbc02d"; // dark yellow
                    } else if (item.type === "tag") {
                      contentText = item.body;
                      dotBgColor = "#9c27b0"; // purple
                    } else if (item.type === "schedule_history") {
                      contentText = item.body;
                      dotBgColor = "#607d8b"; // grey-blue
                    } else {
                      if (idx === 0) {
                        contentText = "Inicio de la conversación";
                        dotBgColor = "#e91e63";
                      } else if (!item.userId) {
                        contentText = "Ticket devuelto a la cola de espera (Pendientes)";
                        dotBgColor = "#ff9800";
                      } else {
                        contentText = `Asignado a asesor: ${item.user?.name || "Desconocido"}`;
                        dotBgColor = "#2196f3";
                      }

                      if (item.finishedAt) {
                        const durationText = formatDuration(item.createdAt, item.finishedAt);
                        contentText += ` (Duración: ${durationText})`;
                      } else {
                        contentText += " (En atención actualmente)";
                        dotBgColor = "#4caf50";
                      }
                    }

                    return (
                      <TimelineItem key={item.id} style={{ minHeight: "60px" }}>
                        <TimelineSeparator>
                          <TimelineDot style={{ backgroundColor: dotBgColor }} />
                          {!isLast && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="body2" style={{ fontWeight: "500" }}>
                            {contentText}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {dateFormatted}
                          </Typography>
                        </TimelineContent>
                      </TimelineItem>
                    );
                  })}
                </Timeline>
              );
            })()}
          </div>
        </DialogContent>
        <DialogActions>
          {ticket?.status === "pending" && (
            <Button
              onClick={async () => {
                try {
                  await api.put(`/tickets/${ticket.id}`, { status: "open", userId: user.id });
                  toast.success("Lead aceptado y puesto En Atención");
                  handleCloseDetails();
                } catch (err) { toastError(err); }
              }}
              color="primary"
              variant="contained"
            >
              Aceptar Lead
            </Button>
          )}

          {ticket?.status === "open" && (
            <Button
              onClick={async () => {
                try {
                  await api.put(`/tickets/${ticket.id}`, { status: "closed" });
                  toast.success("Lead marcado como Resuelto");
                  handleCloseDetails();
                } catch (err) { toastError(err); }
              }}
              style={{ backgroundColor: "#2e7d32", color: "#fff" }}
              variant="contained"
            >
              Resolver Lead
            </Button>
          )}

          {ticket?.status === "closed" && (
            <Button
              onClick={async () => {
                try {
                  await api.put(`/tickets/${ticket.id}`, { status: "open" });
                  toast.success("Lead reabierto En Atención");
                  handleCloseDetails();
                } catch (err) { toastError(err); }
              }}
              color="primary"
              variant="outlined"
            >
              Reabrir Lead
            </Button>
          )}

          <Button onClick={(e) => handleOpenChat(e)} color="primary" variant="contained" startIcon={<ChatIcon />}>
            Ir al Chat
          </Button>
          <Button onClick={handleCloseDetails} color="secondary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const Kanban = () => {
  const classes = useStyles();
  const [boardData, setBoardData] = useState({ lanes: [] });
  const { user } = useContext(AuthContext);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchTickets = async () => {
    try {
      const { data: queues } = await api.get("/queue");
      const params = {
        showAll: showAllTickets ? "true" : "false"
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const { data: ticketsData } = await api.get("/tickets", { params });

      const lanes = queues.map((queue) => {
        const filteredTickets = ticketsData.tickets.filter((ticket) =>
          ticket.queueId === queue.id || ticket.queue?.id === queue.id
        ).map(ticket => ({
          id: ticket.id.toString(),
          title: ticket.contact?.name || "Sin nombre",
          description: ticket.lastMessage || "Sin mensajes",
          label: ticket.whatsapp?.name,
          metadata: { ticketId: ticket.id, ticket },
          style: { borderLeft: `5px solid ${queue.color || "#2576d2"}` }
        }));

        return {
          id: queue.id.toString(),
          title: queue.name,
          label: filteredTickets.length.toString(),
          cards: filteredTickets,
          style: { backgroundColor: "#f4f4f4", width: 280 }
        };
      });

      const unassignedTickets = ticketsData.tickets.filter(
        (ticket) => !ticket.queueId && !ticket.queue?.id
      ).map(ticket => ({
        id: ticket.id.toString(),
        title: ticket.contact?.name || "Sin nombre",
        description: ticket.lastMessage || "Sin mensajes",
        label: ticket.whatsapp?.name,
        metadata: { ticketId: ticket.id, ticket },
        style: { borderLeft: `5px solid #9e9e9e` }
      }));

      lanes.unshift({
        id: "unassigned",
        title: "Sin Departamento",
        label: unassignedTickets.length.toString(),
        cards: unassignedTickets,
        style: { backgroundColor: "#eeeeee", width: 280 }
      });

      setBoardData({ lanes });
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [showAllTickets, statusFilter]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("ticket", (data) => {
      if (data.action === "update" || data.action === "create") {
        fetchTickets();
      }
    });

    socket.on("appMessage", (data) => {
      if (data.action === "create" && (data.message.mediaType === "note" || data.message.mediaType === "tag" || data.message.mediaType === "schedule_history")) {
        fetchTickets();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleDragEnd = async (cardId, sourceLaneId, targetLaneId) => {
    if (sourceLaneId === targetLaneId) return;

    try {
      const newQueueId = targetLaneId === "unassigned" ? null : parseInt(targetLaneId);
      await api.put(`/tickets/${cardId}`, { queueId: newQueueId });
      toast.success("Departamento actualizado correctamente");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Title>Pipeline (Kanban)</Title>
          <ButtonGroup size="small" variant="outlined" style={{ marginLeft: 12 }}>
            <Button
              startIcon={<ViewColumnIcon />}
              variant="contained"
              color="primary"
            >
              Tablero Kanban
            </Button>
            <Button
              startIcon={<TableChartIcon />}
              onClick={() => history.push("/pipeline-table")}
            >
              Tabla Excel
            </Button>
          </ButtonGroup>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginLeft: "auto" }}>
          <FormControl variant="outlined" size="small" style={{ minWidth: 200, backgroundColor: "#fff", borderRadius: 4 }}>
            <InputLabel id="status-filter-label">Estado del Lead</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Estado del Lead"
            >
              <MenuItem value="all">⚡ Todos los Estados</MenuItem>
              <MenuItem value="pending">🟡 Nuevos Leads (Pendientes)</MenuItem>
              <MenuItem value="open">🟢 En Atención (Abiertos)</MenuItem>
              <MenuItem value="closed">🔴 Resueltos (Cerrados)</MenuItem>
            </Select>
          </FormControl>
          {(user.profile?.toLowerCase() === "admin" || user.profile?.toLowerCase() === "superadmin") && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setShowAllTickets(prev => !prev)}
            >
              {showAllTickets ? "Ver solo mis Leads" : "Ver todos los Leads"}
            </Button>
          )}
        </div>
      </MainHeader>
      <div className={classes.boardContainer}>
        <Board
          data={boardData}
          handleDragEnd={handleDragEnd}
          draggable
          components={{ Card: CustomCard }}
          style={{ backgroundColor: "transparent", padding: "10px" }}
        />
      </div>
    </MainContainer>
  );
};

export default Kanban;
