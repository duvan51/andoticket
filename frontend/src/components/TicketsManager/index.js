import React, { useContext, useEffect, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import SearchIcon from "@material-ui/icons/Search";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import MoveToInboxIcon from "@material-ui/icons/MoveToInbox";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import { Button, FormControl, InputLabel, MenuItem, Select, Typography, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import { amber } from "@material-ui/core/colors";
import NotificationsActiveIcon from "@material-ui/icons/NotificationsActive";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import PeopleIcon from "@material-ui/icons/People";
import GroupIcon from "@material-ui/icons/Group";
import { useHistory } from "react-router-dom";
import openSocket from "../../services/socket-io";
import { List, ListItem, ListItemAvatar, ListItemText, Avatar } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
  },
  tabsHeader: {
    flex: "none",
    backgroundColor: theme.palette.background.paper,
  },
  settingsIcon: {
    alignSelf: "center",
    marginLeft: "auto",
    padding: 8,
  },
  tab: {
    minWidth: 120,
    width: 120,
  },
  ticketOptionsBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: theme.palette.background.paper,
    padding: theme.spacing(1),
  },
  serachInputWrapper: {
    flex: 1,
    background: theme.palette.background.default,
    display: "flex",
    borderRadius: 40,
    padding: 4,
    marginRight: theme.spacing(1),
  },
  searchIcon: {
    color: "grey",
    marginLeft: 6,
    marginRight: 6,
    alignSelf: "center",
  },
  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: 30,
    color: theme.palette.text.primary, 
    backgroundColor: theme.palette.background.default,
  },
  badge: {
    right: "-10px",
    "& .MuiBadge-badge": {
      fontSize: "0.8rem",
      height: 20,
      minWidth: 20,
    }
  },
  badgeUnanswered: {
    right: "-10px",
    "& .MuiBadge-badge": {
      backgroundColor: amber[400],
      color: "#FFF",
      fontSize: "0.8rem",
      height: 20,
      minWidth: 20,
    },
  },
  tabAlert: {
    minWidth: "20% !important",
    width: "20%",
    padding: theme.spacing(0, 1),
    flexGrow: 0,
    flexBasis: "20% !important",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  tabChats: {
    minWidth: "20% !important",
    width: "20%",
    flexGrow: 0,
    flexBasis: "20% !important",
  },
  tabLeads: {
    minWidth: "20% !important",
    width: "20%",
    flexGrow: 0,
    flexBasis: "20% !important",
  },
  tabGroups: {
    minWidth: "20% !important",
    width: "20%",
    flexGrow: 0,
    flexBasis: "20% !important",
  },
  tabInternal: {
    minWidth: "20% !important",
    width: "20%",
    padding: theme.spacing(0, 1),
    flexGrow: 0,
    flexBasis: "20% !important",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  "@keyframes shake": {
    "0%": { transform: "rotate(0deg)" },
    "10%": { transform: "rotate(8deg)" },
    "20%": { transform: "rotate(-8deg)" },
    "30%": { transform: "rotate(8deg)" },
    "40%": { transform: "rotate(-8deg)" },
    "50%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(0deg)" },
  },
  shaking: {
    animation: "$shake 2s infinite ease-in-out",
    display: "inline-block",
    color: amber[400],
  },
  iconInactive: {
    color: theme.palette.text.secondary,
  },
  tabLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  show: {
    display: "block",
  },
  hide: {
    display: "none !important",
  },
  mobileMenuButton: {
    display: "none",
    [theme.breakpoints.down("sm")]: {
      display: "inline-flex",
      color: theme.palette.text.primary,
    },
  },
}));

const TicketsManager = () => {
  const classes = useStyles();
  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const [tabOpen, setTabOpen] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const searchInputRef = useRef();
  const { user } = useContext(AuthContext);
  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const userQueueIds = user.queues?.map((q) => q.id) || [];
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [tags, setTags] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [internalTickets, setInternalTickets] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(user?.id || "");
  const [allUsers, setAllUsers] = useState([]);
  const history = useHistory();

  const [selectedTickets, setSelectedTickets] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferUser, setTransferUser] = useState("");
  const [transferQueue, setTransferQueue] = useState("");
  const [transferWhatsapp, setTransferWhatsapp] = useState("");
  const [whatsApps, setWhatsApps] = useState([]);
  const [queuesList, setQueuesList] = useState([]);

  useEffect(() => {
    if (transferModalOpen) {
      const loadData = async () => {
        try {
          const { data: whatsappData } = await api.get("/whatsapp/");
          setWhatsApps(whatsappData);
          const { data: queueData } = await api.get("/queue");
          setQueuesList(queueData);
        } catch (err) {
          toastError(err);
        }
      };
      loadData();
    }
  }, [transferModalOpen]);

  const handleSelectTicket = (id) => {
    setSelectedTickets((prev) => {
      if (prev.includes(id)) {
        return prev.filter((tId) => tId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedTickets([]);
  };

  const handleBulkAccept = async () => {
    if (selectedTickets.length === 0) return;
    setBulkLoading(true);
    try {
      await api.put("/tickets/bulk", {
        ids: selectedTickets,
        ticketData: { status: "open", userId: user.id }
      });
      setSelectedTickets([]);
      setSelectionMode(false);
    } catch (err) {
      toastError(err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkResolve = async () => {
    if (selectedTickets.length === 0) return;
    setBulkLoading(true);
    try {
      await api.put("/tickets/bulk", {
        ids: selectedTickets,
        ticketData: { status: "closed" }
      });
      setSelectedTickets([]);
      setSelectionMode(false);
    } catch (err) {
      toastError(err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTickets.length === 0) return;
    if (window.confirm("¿Está seguro de que desea eliminar los chats seleccionados?")) {
      setBulkLoading(true);
      try {
        await api.delete("/tickets/bulk", {
          data: { ids: selectedTickets }
        });
        setSelectedTickets([]);
        setSelectionMode(false);
      } catch (err) {
        toastError(err);
      } finally {
        setBulkLoading(false);
      }
    }
  };

  const handleBulkTransfer = async () => {
    if (selectedTickets.length === 0) return;
    setBulkLoading(true);
    try {
      const ticketData = {};
      if (transferUser) ticketData.userId = transferUser;
      if (transferQueue) ticketData.queueId = transferQueue;
      if (transferWhatsapp) ticketData.whatsappId = transferWhatsapp;

      await api.put("/tickets/bulk", {
        ids: selectedTickets,
        ticketData
      });
      setSelectedTickets([]);
      setSelectionMode(false);
      setTransferModalOpen(false);
      setTransferUser("");
      setTransferQueue("");
      setTransferWhatsapp("");
    } catch (err) {
      toastError(err);
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    const fetchCompanyQueues = async () => {
      try {
        const { data } = await api.get("/queue");
        if (data && data.length > 0) {
          const allQueueIds = data.map((q) => q.id);
          if (!user.queues || user.queues.length === 0 || user.profile?.toUpperCase() === "ADMIN" || user.profile?.toUpperCase() === "SUPERADMIN") {
            setSelectedQueueIds(allQueueIds);
          }
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchCompanyQueues();
  }, [user]);

  useEffect(() => {
    if (user.profile?.toUpperCase() === "ADMIN" || user.profile?.toUpperCase() === "SUPERADMIN") {
      const fetchAllUsers = async () => {
        try {
          const { data } = await api.get("/users");
          setAllUsers(data.users || []);
        } catch (err) {
          toastError(err);
        }
      };
      fetchAllUsers();
    }
  }, [user]);

  const fetchInternalTickets = async () => {
    try {
      const { data } = await api.get("/tickets", {
        params: { isInternal: "true" }
      });
      setInternalTickets(data.tickets || []);
    } catch (err) {
      // Ignored background fetch error
    }
  };

  useEffect(() => {
    fetchInternalTickets();
  }, []);

  useEffect(() => {
    const socket = openSocket();

    socket.on("connect", () => {
      socket.emit("joinNotification");
    });

    socket.on("appMessage", (data) => {
      if (data.action === "create" && data.ticket && data.ticket.contact && data.ticket.contact.number.startsWith("user_")) {
        fetchInternalTickets();
      }
    });

    socket.on("ticket", (data) => {
      if (data.action === "update" && data.ticket && data.ticket.contact && data.ticket.contact.number.startsWith("user_")) {
        fetchInternalTickets();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const internalUnreadCount = internalTickets.reduce((acc, t) => acc + t.unreadMessages, 0);

  const getUserUnreadCount = (userId) => {
    const ticket = internalTickets.find(t => t.contact.number === `user_${userId}`);
    return ticket ? ticket.unreadMessages : 0;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users");
        const otherUsers = data.users.filter(u => u.id !== user?.id);
        setUsersList(otherUsers);
      } catch (err) {
        toastError(err);
      }
    };
    fetchUsers();
  }, [user]);

  const handleStartInternalChat = async (targetUserId) => {
    try {
      const { data } = await api.post("/tickets/internal", { targetUserId });
      history.push(`/tickets/${data.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleStartInternalGroupChat = async () => {
    try {
      const { data } = await api.post("/tickets/internal/group");
      history.push(`/tickets/${data.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data } = await api.get("/tags");
        setTags(data);
      } catch (err) {
        toastError(err);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    if (user.profile?.toUpperCase() === "ADMIN" || user.profile?.toUpperCase() === "SUPERADMIN") {
      setShowAllTickets(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "search") {
      searchInputRef.current.focus();
      setSearchParam("");
    }
  }, [tab]);

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();

    clearTimeout(searchTimeout);

    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      setTab("open");
      return;
    }

    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
    }, 500);
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const handleChangeTabOpen = (e, newValue) => {
    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0 };
    }
  };

  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(e) => setNewTicketModalOpen(false)}
      />
      <Paper elevation={0} square className={classes.tabsHeader}>
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="icon label tabs example"
        >
          <Tab
            value={"open"}
            icon={<MoveToInboxIcon />}
            label={i18n.t("tickets.tabs.open.title")}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"closed"}
            icon={<CheckBoxIcon />}
            label={i18n.t("tickets.tabs.closed.title")}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"search"}
            icon={<SearchIcon />}
            label={i18n.t("tickets.tabs.search.title")}
            classes={{ root: classes.tab }}
          />
        </Tabs>
      </Paper>
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        {tab === "search" ? (
          <div className={classes.serachInputWrapper}>
            <IconButton 
              className={classes.mobileMenuButton}
              onClick={() => {
                const btn = document.getElementById('main-drawer-toggle');
                if (btn) btn.click();
              }}
            >
              <MenuIcon />
            </IconButton>
            <SearchIcon className={classes.searchIcon} />
            <InputBase
              className={classes.searchInput}
              inputRef={searchInputRef}
              placeholder={i18n.t("tickets.search.placeholder")}
              type="search"
              onChange={handleSearch}
            />
          </div>
        ) : (
          <>
            <IconButton 
              className={classes.mobileMenuButton}
              onClick={() => {
                const btn = document.getElementById('main-drawer-toggle');
                if (btn) btn.click();
              }}
              style={{ marginRight: 6 }}
            >
              <MenuIcon />
            </IconButton>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setNewTicketModalOpen(true)}
            >
              {i18n.t("ticketsManager.buttons.newTicket")}
            </Button>
            <Button
              variant={selectionMode ? "contained" : "outlined"}
              color="secondary"
              onClick={handleToggleSelectionMode}
              style={{ marginLeft: 6 }}
            >
              {selectionMode ? "Cancelar" : "Seleccionar"}
            </Button>
          </>
        )}
        <TicketsQueueSelect
          style={{ marginLeft: 6 }}
          selectedQueueIds={selectedQueueIds}
          userQueues={user?.queues}
          onChange={(values) => setSelectedQueueIds(values)}
        />
      </Paper>
      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
        <Tabs
          value={tabOpen}
          onChange={handleChangeTabOpen}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            className={classes.tabAlert}
            label={
              <Badge
                className={classes.badgeUnanswered}
                badgeContent={unansweredCount}
                max={99}
                overlap="rectangular"
              >
                <NotificationsActiveIcon 
                  className={unansweredCount > 0 ? classes.shaking : classes.iconInactive} 
                />
              </Badge>
            }
            value={"unanswered"}
          />
          <Tab
            className={classes.tabChats}
            label={
              <Badge
                className={classes.badge}
                badgeContent={openCount}
                color="primary"
                overlap="rectangular"
              >
                Chats
              </Badge>
            }
            value={"open"}
          />
          <Tab
            className={classes.tabLeads}
            label={
              <Badge
                className={classes.badge}
                badgeContent={pendingCount}
                color="secondary"
                overlap="rectangular"
              >
                Leads
              </Badge>
            }
            value={"pending"}
          />
          <Tab
            className={classes.tabGroups}
            label={
              <Badge
                className={classes.badge}
                badgeContent={groupsCount}
                color="primary"
                overlap="rectangular"
              >
                <GroupIcon />
              </Badge>
            }
            value={"groups"}
          />
          <Tab
            className={classes.tabInternal}
            label={
              <Badge
                className={classes.badge}
                badgeContent={internalUnreadCount}
                color="primary"
                overlap="rectangular"
              >
                <PeopleIcon />
              </Badge>
            }
            value={"internal"}
          />
        </Tabs>
        <Paper square elevation={0} style={{ padding: "0 8px 8px 8px", display: "flex", gap: "8px" }}>
          <FormControl fullWidth margin="dense" variant="outlined" style={{ flex: 1 }}>
            <InputLabel id="tag-filter-label">{i18n.t("ticketsManager.tags.placeholder")}</InputLabel>
            <Select
              labelId="tag-filter-label"
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              label={i18n.t("ticketsManager.tags.placeholder")}
            >
              <MenuItem value=""><em>Ninguna</em></MenuItem>
              {tags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id} style={{color: tag.color}}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {(user.profile?.toUpperCase() === "ADMIN" || user.profile?.toUpperCase() === "SUPERADMIN") && showAllTickets && (
            <FormControl fullWidth margin="dense" variant="outlined" style={{ flex: 1 }}>
              <InputLabel id="user-filter-label">Filtrar por Asesor</InputLabel>
              <Select
                labelId="user-filter-label"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                label="Filtrar por Asesor"
              >
                <MenuItem value=""><em>Todos los Asesores</em></MenuItem>
                {allUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Paper>
        <Paper className={classes.ticketsWrapper}>
          <TicketsList
            status="open"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            tagId={selectedTagId}
            userId={selectedUserId}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle("open")}
            isGroup="false"
            selectedTickets={selectedTickets}
            onSelectTicket={handleSelectTicket}
            selectionMode={selectionMode}
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            tagId={selectedTagId}
            userId={selectedUserId}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle("pending")}
            isGroup="false"
            selectedTickets={selectedTickets}
            onSelectTicket={handleSelectTicket}
            selectionMode={selectionMode}
          />
          <TicketsList
            status="open"
            unanswered="true"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            tagId={selectedTagId}
            userId={selectedUserId}
            updateCount={(val) => setUnansweredCount(val)}
            style={applyPanelStyle("unanswered")}
            isGroup="false"
            selectedTickets={selectedTickets}
            onSelectTicket={handleSelectTicket}
            selectionMode={selectionMode}
          />
          <TicketsList
            isGroup="true"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            tagId={selectedTagId}
            userId={selectedUserId}
            updateCount={(val) => setGroupsCount(val)}
            style={applyPanelStyle("groups")}
            selectedTickets={selectedTickets}
            onSelectTicket={handleSelectTicket}
            selectionMode={selectionMode}
          />
          {tabOpen === "internal" && (
            <div style={{ flex: 1, overflowY: "scroll" }}>
              <List>
                <ListItem
                  button
                  style={{ backgroundColor: "#e8eaf6" }}
                  onClick={handleStartInternalGroupChat}
                >
                  <ListItemAvatar>
                    <Avatar style={{ backgroundColor: "#3f51b5", color: "#fff" }}>
                      <PeopleIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Chat General (Equipo)"
                    secondary="Chat grupal con todos los miembros"
                  />
                </ListItem>
                {usersList.map((u) => (
                  <ListItem
                    button
                    key={u.id}
                    onClick={() => handleStartInternalChat(u.id)}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={getUserUnreadCount(u.id)}
                        color="secondary"
                        overlap="circular"
                      >
                        <Avatar style={{ backgroundColor: "#3f51b5", color: "#fff" }}>
                          {u.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={u.name}
                      secondary={u.email}
                    />
                  </ListItem>
                ))}
                {usersList.length === 0 && (
                  <Typography variant="body2" style={{ textAlign: "center", marginTop: 20 }}>
                    No hay otros usuarios.
                  </Typography>
                )}
              </List>
            </div>
          )}
        </Paper>
      </TabPanel>
      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          tagId={selectedTagId}
          isGroup="false"
          selectedTickets={selectedTickets}
          onSelectTicket={handleSelectTicket}
          selectionMode={selectionMode}
        />
      </TabPanel>
      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
        <TicketsList
          searchParam={searchParam}
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          tagId={selectedTagId}
          isGroup="false"
          selectedTickets={selectedTickets}
          onSelectTicket={handleSelectTicket}
          selectionMode={selectionMode}
        />
      </TabPanel>

      {selectionMode && selectedTickets.length > 0 && (
        <Paper square elevation={1} style={{ padding: 8, display: "flex", alignItems: "center", gap: 8, backgroundColor: "#f5f5f5" }}>
          <Typography variant="body2" style={{ fontWeight: "bold", flex: 1 }}>
            {selectedTickets.length} seleccionados
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleBulkAccept}
            disabled={bulkLoading}
          >
            Aceptar
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleBulkResolve}
            disabled={bulkLoading}
          >
            Resolver
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => setTransferModalOpen(true)}
            disabled={bulkLoading}
          >
            Transferir
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleBulkDelete}
            disabled={bulkLoading}
          >
            Eliminar
          </Button>
        </Paper>
      )}
      
      <Dialog
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Transferir Chats Seleccionados</DialogTitle>
        <DialogContent dividers style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Typography variant="body2" color="textSecondary">
            Seleccione el asesor, departamento o conexión de WhatsApp a la cual desea transferir los {selectedTickets.length} chats seleccionados.
          </Typography>
          <FormControl variant="outlined" fullWidth margin="dense">
            <InputLabel id="transfer-user-label">Asesor</InputLabel>
            <Select
              labelId="transfer-user-label"
              value={transferUser}
              onChange={(e) => setTransferUser(e.target.value)}
              label="Asesor"
            >
              <MenuItem value=""><em>Ninguno</em></MenuItem>
              {allUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" fullWidth margin="dense">
            <InputLabel id="transfer-queue-label">Departamento</InputLabel>
            <Select
              labelId="transfer-queue-label"
              value={transferQueue}
              onChange={(e) => setTransferQueue(e.target.value)}
              label="Departamento"
            >
              <MenuItem value=""><em>Ninguno</em></MenuItem>
              {queuesList.map((q) => (
                <MenuItem key={q.id} value={q.id}>{q.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" fullWidth margin="dense">
            <InputLabel id="transfer-whatsapp-label">Conexión de WhatsApp</InputLabel>
            <Select
              labelId="transfer-whatsapp-label"
              value={transferWhatsapp}
              onChange={(e) => setTransferWhatsapp(e.target.value)}
              label="Conexión de WhatsApp"
            >
              <MenuItem value=""><em>Ninguna</em></MenuItem>
              {whatsApps.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferModalOpen(false)} color="secondary">
            Cancelar
          </Button>
          <Button
            onClick={handleBulkTransfer}
            color="primary"
            variant="contained"
            disabled={bulkLoading || (!transferUser && !transferQueue && !transferWhatsapp)}
          >
            Transferir
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TicketsManager;
