import React, { useState, useEffect, useContext, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  ButtonGroup,
  Box,
  Divider,
} from "@material-ui/core";
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Chat as ChatIcon,
  Phone as PhoneIcon,
  FileCopy as FileCopyIcon,
  NoteAdd as NoteAddIcon,
  GetApp as GetAppIcon,
  ViewColumn as ViewColumnIcon,
  TableChart as TableChartIcon,
  Lock as LockIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Storefront as StorefrontIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
} from "@material-ui/icons";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import toastError from "../../errors/toastError";
import openSocket from "../../services/socket-io";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: theme.spacing(1),
    overflow: "hidden",
  },
  headerControls: {
    display: "flex",
    gap: theme.spacing(1.5),
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  statsBar: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    marginBottom: theme.spacing(1),
    flexWrap: "wrap",
  },
  statChip: {
    fontWeight: "bold",
    fontSize: "12px",
    cursor: "pointer",
  },
  tableWrapper: {
    flex: 1,
    overflow: "auto",
    backgroundColor: "#fff",
    borderRadius: 8,
    border: "1px solid #e0e0e0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  excelTable: {
    minWidth: 950,
    borderCollapse: "separate",
    "& th": {
      backgroundColor: "#f4f6f8",
      color: "#37474f",
      fontWeight: 700,
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "2px solid #cfd8dc",
      borderRight: "1px solid #e0e0e0",
      padding: "8px 12px",
      whiteSpace: "nowrap",
    },
    "& td": {
      fontSize: "13px",
      borderBottom: "1px solid #eceff1",
      borderRight: "1px solid #f0f0f0",
      padding: "6px 12px",
    },
  },
  tableRow: {
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor: "#f9fbff !important",
    },
    "&:nth-of-type(even)": {
      backgroundColor: "#fafbfc",
    },
  },
  contactCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: 32,
    height: 32,
    fontSize: "13px",
    backgroundColor: theme.palette.primary.main,
  },
  contactName: {
    fontWeight: 600,
    color: "#212121",
    fontSize: "13px",
  },
  contactNumber: {
    fontSize: "11px",
    color: "#757575",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  noteSnippet: {
    backgroundColor: "#fffde7",
    color: "#795548",
    border: "1px solid #fff59d",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    display: "inline-block",
    maxWidth: "240px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  queueBadge: {
    fontWeight: 600,
    fontSize: "11px",
    borderRadius: "4px",
    padding: "2px 8px",
    display: "inline-block",
    color: "#fff",
  },
  chatModalContent: {
    backgroundColor: "#e5ddd5",
    padding: theme.spacing(2),
    height: "500px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  chatBubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: "8px 8px 8px 0px",
    padding: "8px 12px",
    maxWidth: "75%",
    boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
    position: "relative",
  },
  chatBubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: "#dcf8c6",
    borderRadius: "8px 8px 0px 8px",
    padding: "8px 12px",
    maxWidth: "75%",
    boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
    position: "relative",
  },
  chatBubbleNote: {
    alignSelf: "center",
    backgroundColor: "#fff8e1",
    border: "1px solid #ffe082",
    borderRadius: "8px",
    padding: "8px 14px",
    maxWidth: "85%",
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
  },
  chatTime: {
    fontSize: "10px",
    color: "#888",
    textAlign: "right",
    marginTop: "4px",
  },
  adReplyBox: {
    borderLeft: "3px solid #1877f2",
    backgroundColor: "#f0f2f5",
    padding: "6px 8px",
    borderRadius: "4px",
    marginBottom: "6px",
    fontSize: "11px",
  },
}));

const PipelineTable = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);

  const [tickets, setTickets] = useState([]);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState("all");
  const [showAllTickets, setShowAllTickets] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Conversation Modal State
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);

  // Quick Note Edit Modal State
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [ticketForNote, setTicketForNote] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchQueues = async () => {
    try {
      const { data } = await api.get("/queue");
      setQueues(data || []);
    } catch (err) {
      toastError(err);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {
        showAll: showAllTickets ? "true" : "false",
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (queueFilter !== "all") {
        if (queueFilter === "unassigned") {
          params.queueIds = JSON.stringify([]);
        } else {
          params.queueIds = JSON.stringify([parseInt(queueFilter, 10)]);
        }
      }

      const { data } = await api.get("/tickets", { params });
      setTickets(data?.tickets || []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, queueFilter, showAllTickets]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("ticket", (data) => {
      if (data.action === "update" || data.action === "create" || data.action === "delete") {
        fetchTickets();
      }
    });

    socket.on("appMessage", (data) => {
      if (
        data.action === "create" &&
        (data.message.mediaType === "note" ||
          data.message.mediaType === "tag" ||
          data.message.mediaType === "chat")
      ) {
        fetchTickets();
        if (selectedTicket && data.message.ticketId === selectedTicket.id) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedTicket]);

  // Open conversation preview modal
  const handleOpenChatModal = async (ticket) => {
    setSelectedTicket(ticket);
    setChatModalOpen(true);
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/messages/${ticket.id}`);
      setMessages(data?.messages || []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCloseChatModal = () => {
    setChatModalOpen(false);
    setSelectedTicket(null);
    setMessages([]);
    setQuickNote("");
  };

  const handleGoToChat = (ticketId) => {
    history.push(`/tickets/${ticketId}`);
  };

  // Quick note submission inside modal
  const handleSendQuickNote = async () => {
    if (!quickNote.trim() || !selectedTicket) return;
    setSendingNote(true);
    try {
      await api.post(`/messages/${selectedTicket.id}`, {
        body: quickNote.trim(),
        isNote: true,
      });
      setQuickNote("");
      toast.success("Nota interna agregada con éxito");
      // Refresh messages
      const { data } = await api.get(`/messages/${selectedTicket.id}`);
      setMessages(data?.messages || []);
      fetchTickets();
    } catch (err) {
      toastError(err);
    } finally {
      setSendingNote(false);
    }
  };

  // Open note edit modal from table
  const handleOpenNoteModal = (ticket) => {
    setTicketForNote(ticket);
    setNoteInput("");
    setNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteInput.trim() || !ticketForNote) return;
    setSavingNote(true);
    try {
      await api.post(`/messages/${ticketForNote.id}`, {
        body: noteInput.trim(),
        isNote: true,
      });
      toast.success("Nota privada guardada");
      setNoteModalOpen(false);
      setNoteInput("");
      setTicketForNote(null);
      fetchTickets();
    } catch (err) {
      toastError(err);
    } finally {
      setSavingNote(false);
    }
  };

  // Inline queue change
  const handleChangeQueue = async (ticketId, newQueueId) => {
    try {
      const queueVal = newQueueId === "" ? null : parseInt(newQueueId, 10);
      await api.put(`/tickets/${ticketId}`, { queueId: queueVal });
      toast.success("Departamento actualizado");
      fetchTickets();
    } catch (err) {
      toastError(err);
    }
  };

  // Copy phone number
  const handleCopyPhone = (number) => {
    if (number) {
      navigator.clipboard.writeText(number);
      toast.success(`Número copiado: ${number}`);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      toast.warning("No hay datos para exportar");
      return;
    }

    const headers = [
      "ID Ticket",
      "Nombre",
      "Teléfono",
      "Última Nota Privada",
      "Departamento",
      "Etiquetas",
      "Estado",
      "Último Mensaje",
      "Fecha Actualización",
    ];

    const rows = filteredTickets.map((t) => {
      const lastNote = t.messages?.filter((m) => m.mediaType === "note").pop()?.body || "";
      const queueName = t.queue?.name || "Sin Departamento";
      const tagsString = t.tags?.map((tag) => tag.name).join(", ") || "";
      const statusLabel =
        t.status === "pending" ? "Nuevo" : t.status === "open" ? "En Atención" : "Resuelto";

      return [
        t.id,
        `"${(t.contact?.name || "").replace(/"/g, '""')}"`,
        `"${t.contact?.number || ""}"`,
        `"${lastNote.replace(/"/g, '""')}"`,
        `"${queueName.replace(/"/g, '""')}"`,
        `"${tagsString.replace(/"/g, '""')}"`,
        `"${statusLabel}"`,
        `"${(t.lastMessage || "").replace(/"/g, '""')}"`,
        `"${format(parseISO(t.updatedAt), "yyyy-MM-dd HH:mm")}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Pipeline_Leads_${format(new Date(), "yyyyMMdd_HHmm")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Archivo CSV descargado con éxito");
  };

  // Filter tickets by search param
  const filteredTickets = useMemo(() => {
    if (!searchParam.trim()) return tickets;
    const lower = searchParam.toLowerCase().trim();

    return tickets.filter((t) => {
      const name = t.contact?.name?.toLowerCase() || "";
      const number = t.contact?.number || "";
      const queueName = t.queue?.name?.toLowerCase() || "";
      const lastMsg = t.lastMessage?.toLowerCase() || "";
      const tagsMatch = t.tags?.some((tag) => tag.name.toLowerCase().includes(lower));
      const notesMatch = t.messages?.some(
        (m) => m.mediaType === "note" && m.body?.toLowerCase().includes(lower)
      );

      return (
        name.includes(lower) ||
        number.includes(lower) ||
        queueName.includes(lower) ||
        lastMsg.includes(lower) ||
        tagsMatch ||
        notesMatch
      );
    });
  }, [tickets, searchParam]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === "pending").length;
    const open = tickets.filter((t) => t.status === "open").length;
    const closed = tickets.filter((t) => t.status === "closed").length;
    return { total, pending, open, closed };
  }, [tickets]);

  const renderStatusBadge = (status) => {
    if (status === "pending") {
      return (
        <span
          style={{
            fontSize: "11px",
            backgroundColor: "#fff8e1",
            color: "#b78103",
            border: "1px solid #ffe082",
            padding: "3px 8px",
            borderRadius: "12px",
            fontWeight: "bold",
          }}
        >
          🟡 Nuevo
        </span>
      );
    }
    if (status === "open") {
      return (
        <span
          style={{
            fontSize: "11px",
            backgroundColor: "#e8f5e9",
            color: "#2e7d32",
            border: "1px solid #a5d6a7",
            padding: "3px 8px",
            borderRadius: "12px",
            fontWeight: "bold",
          }}
        >
          🟢 En Atención
        </span>
      );
    }
    if (status === "closed") {
      return (
        <span
          style={{
            fontSize: "11px",
            backgroundColor: "#ffebee",
            color: "#c62828",
            border: "1px solid #ef9a9a",
            padding: "3px 8px",
            borderRadius: "12px",
            fontWeight: "bold",
          }}
        >
          🔴 Resuelto
        </span>
      );
    }
    return null;
  };

  return (
    <MainContainer>
      <MainHeader>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Title>Pipeline (Vista Excel)</Title>
          <ButtonGroup size="small" variant="outlined" style={{ marginLeft: 12 }}>
            <Button
              startIcon={<ViewColumnIcon />}
              onClick={() => history.push("/kanban")}
            >
              Tablero Kanban
            </Button>
            <Button
              startIcon={<TableChartIcon />}
              variant="contained"
              color="primary"
            >
              Tabla Excel
            </Button>
          </ButtonGroup>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginLeft: "auto" }}>
          <Tooltip title="Actualizar datos">
            <IconButton size="small" onClick={fetchTickets}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<GetAppIcon />}
            onClick={handleExportCSV}
            style={{ backgroundColor: "#2e7d32" }}
          >
            Exportar Excel / CSV
          </Button>
        </div>
      </MainHeader>

      <div className={classes.root}>
        {/* Statistics Bar */}
        <div className={classes.statsBar}>
          <Chip
            label={`Total: ${stats.total}`}
            onClick={() => setStatusFilter("all")}
            variant={statusFilter === "all" ? "default" : "outlined"}
            color="primary"
            className={classes.statChip}
            size="small"
          />
          <Chip
            label={`🟡 Nuevos: ${stats.pending}`}
            onClick={() => setStatusFilter("pending")}
            variant={statusFilter === "pending" ? "default" : "outlined"}
            style={{
              backgroundColor: statusFilter === "pending" ? "#ffe082" : "#fff8e1",
              color: "#b78103",
              borderColor: "#ffe082",
            }}
            className={classes.statChip}
            size="small"
          />
          <Chip
            label={`🟢 En Atención: ${stats.open}`}
            onClick={() => setStatusFilter("open")}
            variant={statusFilter === "open" ? "default" : "outlined"}
            style={{
              backgroundColor: statusFilter === "open" ? "#a5d6a7" : "#e8f5e9",
              color: "#2e7d32",
              borderColor: "#a5d6a7",
            }}
            className={classes.statChip}
            size="small"
          />
          <Chip
            label={`🔴 Resueltos: ${stats.closed}`}
            onClick={() => setStatusFilter("closed")}
            variant={statusFilter === "closed" ? "default" : "outlined"}
            style={{
              backgroundColor: statusFilter === "closed" ? "#ef9a9a" : "#ffebee",
              color: "#c62828",
              borderColor: "#ef9a9a",
            }}
            className={classes.statChip}
            size="small"
          />

          {(user?.profile?.toLowerCase() === "admin" ||
            user?.profile?.toLowerCase() === "superadmin") && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              style={{ marginLeft: "auto", fontSize: "11px", height: 26 }}
              onClick={() => setShowAllTickets((prev) => !prev)}
            >
              {showAllTickets ? "Ver solo mis Leads" : "Ver todos los Leads"}
            </Button>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className={classes.headerControls}>
          <TextField
            placeholder="Buscar por nombre, teléfono, nota o etiqueta..."
            variant="outlined"
            size="small"
            value={searchParam}
            onChange={(e) => setSearchParam(e.target.value)}
            style={{ flex: 1, minWidth: 260, backgroundColor: "#fff" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchParam ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchParam("")}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <FormControl variant="outlined" size="small" style={{ minWidth: 160, backgroundColor: "#fff" }}>
            <InputLabel id="queue-filter-select-label">Departamento</InputLabel>
            <Select
              labelId="queue-filter-select-label"
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value)}
              label="Departamento"
            >
              <MenuItem value="all">📂 Todos los Deptos</MenuItem>
              <MenuItem value="unassigned">⚪ Sin Departamento</MenuItem>
              {queues.map((q) => (
                <MenuItem key={q.id} value={q.id.toString()}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: q.color || "#2576d2",
                      marginRight: 6,
                    }}
                  />
                  {q.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" style={{ minWidth: 160, backgroundColor: "#fff" }}>
            <InputLabel id="status-filter-select-label">Estado</InputLabel>
            <Select
              labelId="status-filter-select-label"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Estado"
            >
              <MenuItem value="all">⚡ Todos los Estados</MenuItem>
              <MenuItem value="pending">🟡 Nuevos Leads</MenuItem>
              <MenuItem value="open">🟢 En Atención</MenuItem>
              <MenuItem value="closed">🔴 Resueltos</MenuItem>
            </Select>
          </FormControl>
        </div>

        {/* Excel Spreadsheet Table */}
        <Paper className={classes.tableWrapper} variant="outlined">
          <TableContainer style={{ maxHeight: "calc(100vh - 280px)" }}>
            <Table stickyHeader size="small" className={classes.excelTable}>
              <TableHead>
                <TableRow>
                  <TableCell style={{ width: 40, textAlign: "center" }}>#</TableCell>
                  <TableCell style={{ width: 230 }}>Nombre del Contacto</TableCell>
                  <TableCell style={{ width: 170 }}>Teléfono</TableCell>
                  <TableCell style={{ width: 240 }}>Nota Privada</TableCell>
                  <TableCell style={{ width: 180 }}>Departamento</TableCell>
                  <TableCell style={{ width: 180 }}>Etiquetas</TableCell>
                  <TableCell style={{ width: 110, textAlign: "center" }}>Estado</TableCell>
                  <TableCell style={{ width: 160, textAlign: "center" }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" style={{ padding: 40 }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                        Cargando base de prospectos...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" style={{ padding: 40 }}>
                      <Typography variant="subtitle1" color="textSecondary">
                        No se encontraron leads o tickets con los filtros actuales.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((ticket, index) => {
                      const lastNoteObj = ticket.messages
                        ?.filter((m) => m.mediaType === "note")
                        ?.pop();
                      const lastNote = lastNoteObj?.body || "";

                      return (
                        <TableRow key={ticket.id} className={classes.tableRow}>
                          {/* Row Index */}
                          <TableCell style={{ textAlign: "center", color: "#888", fontWeight: 500 }}>
                            {page * rowsPerPage + index + 1}
                          </TableCell>

                          {/* Contact Name & Avatar */}
                          <TableCell>
                            <div className={classes.contactCell}>
                              <Avatar
                                src={ticket.contact?.profilePicUrl}
                                alt={ticket.contact?.name}
                                className={classes.avatar}
                              >
                                {ticket.contact?.name?.charAt(0)?.toUpperCase() || "C"}
                              </Avatar>
                              <div>
                                <div className={classes.contactName}>
                                  {ticket.contact?.name || "Sin Nombre"}
                                </div>
                                <div style={{ fontSize: "10px", color: "#9e9e9e" }}>
                                  Ticket #{ticket.id} {ticket.whatsapp ? `• ${ticket.whatsapp.name}` : ""}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Phone Number */}
                          <TableCell>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                                {ticket.contact?.number || "-"}
                              </span>
                              {ticket.contact?.number && (
                                <>
                                  <Tooltip title="Copiar número">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleCopyPhone(ticket.contact.number)}
                                      style={{ padding: 2 }}
                                    >
                                      <FileCopyIcon style={{ fontSize: 13, color: "#757575" }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Abrir en WhatsApp">
                                    <IconButton
                                      size="small"
                                      component="a"
                                      href={`https://wa.me/${ticket.contact.number.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ padding: 2 }}
                                    >
                                      <PhoneIcon style={{ fontSize: 13, color: "#25d366" }} />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </TableCell>

                          {/* Private Note */}
                          <TableCell>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {lastNote ? (
                                <Tooltip title={lastNote}>
                                  <span
                                    className={classes.noteSnippet}
                                    onClick={() => handleOpenNoteModal(ticket)}
                                  >
                                    🔒 {lastNote}
                                  </span>
                                </Tooltip>
                              ) : (
                                <Button
                                  size="small"
                                  startIcon={<NoteAddIcon style={{ fontSize: 13 }} />}
                                  onClick={() => handleOpenNoteModal(ticket)}
                                  style={{
                                    fontSize: "11px",
                                    color: "#8d6e63",
                                    padding: "2px 6px",
                                    textTransform: "none",
                                    backgroundColor: "#efebe9",
                                  }}
                                >
                                  + Nota
                                </Button>
                              )}
                            </div>
                          </TableCell>

                          {/* Department / Queue Selector */}
                          <TableCell>
                            <Select
                              value={ticket.queueId ? ticket.queueId.toString() : ""}
                              onChange={(e) => handleChangeQueue(ticket.id, e.target.value)}
                              displayEmpty
                              disableUnderline
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                backgroundColor: ticket.queue?.color ? `${ticket.queue.color}18` : "#f5f5f5",
                                color: ticket.queue?.color || "#616161",
                                padding: "2px 8px",
                                borderRadius: 4,
                                width: "100%",
                              }}
                            >
                              <MenuItem value="" style={{ fontSize: "12px" }}>
                                ⚪ Sin Departamento
                              </MenuItem>
                              {queues.map((q) => (
                                <MenuItem key={q.id} value={q.id.toString()} style={{ fontSize: "12px" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      backgroundColor: q.color || "#2576d2",
                                      marginRight: 6,
                                    }}
                                  />
                                  {q.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>

                          {/* Tags */}
                          <TableCell>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {ticket.tags && ticket.tags.length > 0 ? (
                                ticket.tags.map((tag) => (
                                  <Chip
                                    key={tag.id}
                                    label={tag.name}
                                    size="small"
                                    style={{
                                      backgroundColor: tag.color || "#e0e0e0",
                                      color: "#fff",
                                      fontSize: "10px",
                                      height: 20,
                                      fontWeight: "bold",
                                    }}
                                  />
                                ))
                              ) : (
                                <span style={{ color: "#bdbdbd", fontSize: "11px" }}>Sin etiquetas</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell align="center">{renderStatusBadge(ticket.status)}</TableCell>

                          {/* Actions */}
                          <TableCell align="center">
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <Tooltip title="Ver conversación">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="primary"
                                  startIcon={<VisibilityIcon style={{ fontSize: 14 }} />}
                                  onClick={() => handleOpenChatModal(ticket)}
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                    textTransform: "none",
                                    fontWeight: 600,
                                  }}
                                >
                                  Ver Chat
                                </Button>
                              </Tooltip>

                              <Tooltip title="Ir a conversación completa">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleGoToChat(ticket.id)}
                                  style={{
                                    backgroundColor: "#e3f2fd",
                                    padding: "5px",
                                  }}
                                >
                                  <ChatIcon style={{ fontSize: 15 }} />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[15, 25, 50, 100]}
            component="div"
            count={filteredTickets.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </Paper>
      </div>

      {/* -------------------- MODAL DE CONVERSACIÓN (PREVIEW) -------------------- */}
      <Dialog
        open={chatModalOpen}
        onClose={handleCloseChatModal}
        fullWidth
        maxWidth="md"
        aria-labelledby="conversation-modal-title"
      >
        <DialogTitle
          id="conversation-modal-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            backgroundColor: "#f5f5f5",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Avatar
              src={selectedTicket?.contact?.profilePicUrl}
              alt={selectedTicket?.contact?.name}
              style={{ width: 40, height: 40 }}
            >
              {selectedTicket?.contact?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <div>
              <Typography variant="h6" style={{ fontSize: "16px", fontWeight: "bold" }}>
                {selectedTicket?.contact?.name} #{selectedTicket?.id}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Tel: {selectedTicket?.contact?.number} • {selectedTicket?.queue?.name || "Sin Departamento"}
              </Typography>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginLeft: "auto" }}>
            {selectedTicket && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<ChatIcon />}
                onClick={() => handleGoToChat(selectedTicket.id)}
                style={{ fontWeight: "bold", textTransform: "none" }}
              >
                Ir a la conversación para responder
              </Button>
            )}
            <IconButton size="small" onClick={handleCloseChatModal}>
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>

        <DialogContent dividers style={{ padding: 0 }}>
          <div className={classes.chatModalContent}>
            {loadingMessages ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <CircularProgress size={36} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: "center", marginTop: "100px", color: "#666" }}>
                <Typography variant="body1">No hay mensajes registrados en este ticket.</Typography>
              </div>
            ) : (
              messages.map((m) => {
                const isNote = m.mediaType === "note";
                const isMe = m.fromMe;
                const time = m.createdAt ? format(parseISO(m.createdAt), "HH:mm") : "";

                if (isNote) {
                  return (
                    <div key={m.id} className={classes.chatBubbleNote}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f57f17", fontWeight: "bold", fontSize: "11px", marginBottom: "3px" }}>
                        <LockIcon style={{ fontSize: 13 }} /> NOTA INTERNA
                      </div>
                      <Typography variant="body2" style={{ fontSize: "13px", color: "#424242" }}>
                        {m.body}
                      </Typography>
                      <div className={classes.chatTime}>{time}</div>
                    </div>
                  );
                }

                // Check adReply on message
                let adData = null;
                if (m.adReply) {
                  try {
                    adData = typeof m.adReply === "string" ? JSON.parse(m.adReply) : m.adReply;
                  } catch (e) {
                    adData = null;
                  }
                }

                return (
                  <div
                    key={m.id}
                    className={isMe ? classes.chatBubbleRight : classes.chatBubbleLeft}
                  >
                    {/* Meta Ad Card Preview if message has adReply */}
                    {adData && (
                      <div className={classes.adReplyBox}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold", color: "#1877f2" }}>
                          <StorefrontIcon style={{ fontSize: 14 }} /> Anuncio de Facebook / Instagram
                        </div>
                        {adData.title && (
                          <div style={{ fontWeight: 600, marginTop: 2 }}>{adData.title}</div>
                        )}
                        {adData.body && (
                          <div style={{ color: "#65676b", fontSize: "10px" }}>{adData.body}</div>
                        )}
                        {adData.sourceUrl && (
                          <a
                            href={adData.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: "2px", color: "#1877f2", textDecoration: "none", marginTop: 2 }}
                          >
                            Ver anuncio ↗
                          </a>
                        )}
                      </div>
                    )}

                    {/* Media render: Image or Audio */}
                    {m.mediaType === "image" && m.mediaUrl && (
                      <div style={{ marginBottom: 6 }}>
                        <img
                          src={m.mediaUrl}
                          alt="media"
                          style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: 4 }}
                        />
                      </div>
                    )}
                    {m.mediaType === "audio" && m.mediaUrl && (
                      <div style={{ marginBottom: 6 }}>
                        <audio controls src={m.mediaUrl} style={{ width: "240px", height: "36px" }} />
                      </div>
                    )}

                    {m.mediaType !== "audio" &&
                      m.mediaType !== "ptt" &&
                      m.body &&
                      m.body !== m.mediaUrl &&
                      !/^[\w\s.-]+\.(mp3|ogg|wav|opus|m4a|aac|jpe?g|png|webp|gif|jfif)$/i.test(m.body.trim()) && (
                        <Typography variant="body2" style={{ fontSize: "13px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {m.body}
                        </Typography>
                    )}
                    <div className={classes.chatTime}>{time}</div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>

        <DialogActions style={{ padding: "12px 16px", backgroundColor: "#f9f9f9", display: "flex", gap: "8px" }}>
          <TextField
            placeholder="Escribir una nota privada rápida para este ticket..."
            variant="outlined"
            size="small"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendQuickNote();
              }
            }}
            style={{ flex: 1, backgroundColor: "#fff" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon style={{ fontSize: 16, color: "#f57f17" }} />
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleSendQuickNote}
            disabled={sendingNote || !quickNote.trim()}
            startIcon={sendingNote ? <CircularProgress size={16} /> : <SendIcon />}
            style={{ textTransform: "none" }}
          >
            Guardar Nota
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={() => handleGoToChat(selectedTicket.id)}
            startIcon={<ChatIcon />}
            style={{ textTransform: "none", fontWeight: "bold" }}
          >
            Responder en el Chat
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------- MODAL PARA AGREGAR NOTA RÁPIDA -------------------- */}
      <Dialog
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <LockIcon style={{ color: "#f57f17" }} />
          Agregar Nota Privada • {ticketForNote?.contact?.name} #{ticketForNote?.id}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
            Esta nota es interna y solo será visible para los asesores de tu equipo. El cliente NO la recibirá.
          </Typography>
          <TextField
            label="Escribe tu nota interna"
            multiline
            rows={4}
            variant="outlined"
            fullWidth
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Ej: Cliente interesado en plan anual, volver a llamar el viernes a las 3pm..."
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteModalOpen(false)} color="default">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveNote}
            color="primary"
            variant="contained"
            disabled={savingNote || !noteInput.trim()}
            startIcon={savingNote ? <CircularProgress size={16} /> : <SendIcon />}
          >
            Guardar Nota
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default PipelineTable;
