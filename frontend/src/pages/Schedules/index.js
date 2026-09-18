import React, { useState, useEffect } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

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
  Typography,
} from "@material-ui/core";
import { Edit, DeleteOutline, ChevronLeft, ChevronRight, CalendarToday, ViewList, AttachFile } from "@material-ui/icons";
import SearchIcon from "@material-ui/icons/Search";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import SchedulesModal from "../../components/SchedulesModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import ScheduleDetailModal from "../../components/ScheduleDetailModal";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import clsx from "clsx";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  mainPaperCalendar: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  calendarContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    overflow: "hidden",
  },
  calendarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    flex: 1,
    backgroundColor: theme.palette.divider,
    gap: "1px",
    overflowY: "auto",
  },
  weekDayHeader: {
    padding: theme.spacing(1),
    textAlign: "center",
    fontWeight: "bold",
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontSize: "0.85rem",
  },
  dayCell: {
    position: "relative",
    backgroundColor: theme.palette.background.paper,
    minHeight: "110px",
    padding: theme.spacing(1),
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  dayCellOutside: {
    backgroundColor: theme.palette.background.default,
    opacity: 0.5,
  },
  dayCellToday: {
    backgroundColor: theme.palette.action.selected,
  },
  dayNumberContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  dayNumber: {
    fontWeight: 500,
    fontSize: "0.85rem",
    color: theme.palette.text.primary,
  },
  dayNumberToday: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: "bold",
  },
  eventsContainer: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    ...theme.scrollbarStyles,
  },
  eventChip: {
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: "pointer",
    transition: "transform 0.1s, opacity 0.2s",
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
    "&:hover": {
      transform: "scale(1.02)",
      opacity: 0.9,
    },
  },
  eventPending: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
  eventSent: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    border: "1px solid #c8e6c9",
  },
  eventAppointment: {
    backgroundColor: "#f3e5f5",
    color: "#7b1fa2",
    border: "1px solid #e1bee7",
  },
  eventCancelled: {
    backgroundColor: "#eeeeee",
    color: "#616161",
    border: "1px solid #bdbdbd",
  },
  eventNoShow: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    border: "1px solid #ffcdd2",
  },
  eventDeleted: {
    textDecoration: "line-through",
    opacity: 0.6,
  },
  viewToggle: {
    marginRight: theme.spacing(1),
  },
}));

const Schedules = () => {
  const classes = useStyles();

  const [viewMode, setViewMode] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [modalInitialValues, setModalInitialValues] = useState(null);
  const [schedulesModalOpen, setSchedulesModalOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedScheduleForDetail, setSelectedScheduleForDetail] = useState(null);

  const handleOpenDetailModal = (schedule) => {
    setSelectedScheduleForDetail(schedule);
    setDetailModalOpen(true);
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/scheduled-messages");
      setSchedules(data);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenSchedulesModal = () => {
    setSelectedScheduleId(null);
    setModalInitialValues(null);
    setSchedulesModalOpen(true);
  };

  const handleOpenSchedulesModalWithDate = (date) => {
    setSelectedScheduleId(null);
    const targetDate = new Date(date);
    const now = new Date();
    targetDate.setHours(now.getHours());
    targetDate.setMinutes(now.getMinutes() + 5);
    setModalInitialValues({
      sendAt: targetDate,
    });
    setSchedulesModalOpen(true);
  };

  const handleCloseSchedulesModal = () => {
    setSelectedScheduleId(null);
    setModalInitialValues(null);
    setSchedulesModalOpen(false);
  };

  const handleEditSchedule = (schedule) => {
    setSelectedScheduleId(schedule.id);
    setModalInitialValues(null);
    setSchedulesModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await api.delete(`/scheduled-messages/${scheduleId}`);
      toast.success(i18n.t("schedules.toasts.deleted"));
      fetchSchedules();
    } catch (err) {
      toastError(err);
    }
    setDeletingSchedule(null);
  };

  const filteredSchedules = schedules.filter((s) => {
    const contactName = s.contact?.name?.toLowerCase() || "";
    const body = s.body?.toLowerCase() || "";
    return contactName.includes(searchParam) || body.includes(searchParam);
  });

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getDaySchedules = (day) => {
    return filteredSchedules.filter((s) => {
      if (!s.sendAt) return false;
      return isSameDay(parseISO(s.sendAt), day);
    });
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = (date) => {
    const formatted = date.toLocaleString(i18n.language || "es", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingSchedule &&
          `${i18n.t("schedules.confirmationModal.deleteTitle")}`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteSchedule(deletingSchedule.id)}
      >
        {i18n.t("schedules.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <SchedulesModal
        open={schedulesModalOpen}
        onClose={handleCloseSchedulesModal}
        scheduleId={selectedScheduleId}
        onSave={fetchSchedules}
        initialValues={modalInitialValues}
      />
      <ScheduleDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedScheduleForDetail(null);
        }}
        schedule={selectedScheduleForDetail}
        onEdit={(schedule) => {
          handleEditSchedule(schedule);
        }}
        onStatusChange={() => {
          fetchSchedules();
        }}
        onAddAnother={(schedule) => {
          setSelectedScheduleId(null);
          setModalInitialValues({
            contactId: schedule.contactId,
            contact: schedule.contact,
            mediaType: "appointment",
          });
          setSchedulesModalOpen(true);
        }}
      />
      <MainHeader>
        <Title>{i18n.t("schedules.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("schedules.searchPlaceholder")}
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
          <IconButton
            color="primary"
            onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
            className={classes.viewToggle}
            title={viewMode === "list" ? "Vista Calendario" : "Vista Lista"}
          >
            {viewMode === "list" ? <CalendarToday /> : <ViewList />}
          </IconButton>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenSchedulesModal}
          >
            {i18n.t("schedules.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      {viewMode === "list" ? (
        <Paper className={classes.mainPaper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center">Tipo</TableCell>
                <TableCell align="center">
                  {i18n.t("schedules.table.contact")}
                </TableCell>
                <TableCell align="center">
                  {i18n.t("schedules.table.body")}
                </TableCell>
                <TableCell align="center">
                  {i18n.t("schedules.table.sendAt")}
                </TableCell>
                <TableCell align="center">
                  {i18n.t("schedules.table.sentAt")}
                </TableCell>
                <TableCell align="center">
                  {i18n.t("schedules.table.actions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <>
                {filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell align="center">
                      {schedule.mediaType === "appointment" ? "📅 Cita / Reunión" : "💬 Mensaje WhatsApp"}
                    </TableCell>
                    <TableCell align="center">
                      {schedule.contact ? `${schedule.contact.name} (${schedule.contact.number})` : ""}
                    </TableCell>
                    <TableCell align="center">
                      {schedule.mediaName && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "#1976d2", fontWeight: "500", marginBottom: "4px" }}>
                          <AttachFile style={{ fontSize: 16 }} />
                          <span>{schedule.mediaName}</span>
                        </div>
                      )}
                      {schedule.body}
                    </TableCell>
                    <TableCell align="center">
                      {schedule.sendAt ? format(parseISO(schedule.sendAt), "dd/MM/yyyy HH:mm") : ""}
                    </TableCell>
                    <TableCell align="center">
                      {schedule.status === "cancelled" ? (
                        <span style={{ color: "gray" }}>Cancelado</span>
                      ) : schedule.status === "deleted" ? (
                        <span style={{ color: "orange", textDecoration: "line-through" }}>Eliminado</span>
                      ) : schedule.status === "no_show" ? (
                        <span style={{ color: "red" }}>No Llegó</span>
                      ) : schedule.sentAt ? (
                        format(parseISO(schedule.sentAt), "dd/MM/yyyy HH:mm")
                      ) : (
                        "Pendiente"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDetailModal(schedule)}
                      >
                        <Edit />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setConfirmModalOpen(true);
                          setDeletingSchedule(schedule);
                        }}
                      >
                        <DeleteOutline />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {loading && <TableRowSkeleton columns={6} />}
              </>
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Paper className={classes.mainPaperCalendar} variant="outlined">
          <div className={classes.calendarContainer}>
            <div className={classes.calendarHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconButton onClick={prevMonth} size="small">
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6" style={{ minWidth: "160px", textAlign: "center" }}>
                  {formatMonthYear(currentDate)}
                </Typography>
                <IconButton onClick={nextMonth} size="small">
                  <ChevronRight />
                </IconButton>
              </div>
              <Button variant="outlined" size="small" onClick={setToday}>
                Hoy
              </Button>
            </div>
            <div className={classes.calendarGrid}>
              {weekDays.map((wd) => (
                <div key={wd} className={classes.weekDayHeader}>
                  {wd}
                </div>
              ))}
              {days.map((day) => {
                const daySchedules = getDaySchedules(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toString()}
                    className={clsx(classes.dayCell, {
                      [classes.dayCellOutside]: !isCurrentMonth,
                      [classes.dayCellToday]: isTodayDate,
                    })}
                    onClick={() => handleOpenSchedulesModalWithDate(day)}
                  >
                    <div className={classes.dayNumberContainer}>
                      <span
                        className={clsx(classes.dayNumber, {
                          [classes.dayNumberToday]: isTodayDate,
                        })}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className={classes.eventsContainer}>
                      {daySchedules.map((schedule) => {
                        const isDeleted = schedule.status === "deleted";
                        const isCancelled = schedule.status === "cancelled";
                        const isNoShow = schedule.status === "no_show";

                        let emoji = "💬 ";
                        if (schedule.mediaUrl) {
                          emoji = "📎 ";
                        }
                        if (schedule.mediaType === "appointment") {
                          if (isDeleted) emoji = "🗑️ ";
                          else if (isCancelled) emoji = "❌ ";
                          else if (isNoShow) emoji = "🚫 ";
                          else emoji = "📅 ";
                        } else {
                          if (isDeleted) emoji = "🗑️ ";
                        }

                        return (
                          <div
                            key={schedule.id}
                            className={clsx(classes.eventChip, {
                              [classes.eventSent]: schedule.mediaType === "message" && schedule.sentAt !== null,
                              [classes.eventPending]: schedule.mediaType === "message" && schedule.sentAt === null && !isCancelled && !isNoShow && !isDeleted,
                              [classes.eventAppointment]: schedule.mediaType === "appointment" && !isCancelled && !isNoShow && !isDeleted,
                              [classes.eventCancelled]: isCancelled,
                              [classes.eventNoShow]: isNoShow,
                              [classes.eventDeleted]: isDeleted,
                            })}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetailModal(schedule);
                            }}
                            title={`${schedule.mediaType === "appointment" ? "Cita" : "Mensaje"} [${schedule.status || "pendiente"}] - ${schedule.contact?.name}: ${schedule.body}`}
                            style={isDeleted ? { textDecoration: "line-through" } : {}}
                          >
                            {emoji}
                            <strong>{schedule.sendAt ? format(parseISO(schedule.sendAt), "HH:mm") : ""}</strong> {schedule.contact?.name || "Cliente"}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Paper>
      )}
    </MainContainer>
  );
};

export default Schedules;
