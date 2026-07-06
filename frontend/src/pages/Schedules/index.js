import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

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
} from "@material-ui/core";
import { Edit, DeleteOutline } from "@material-ui/icons";
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
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const Schedules = () => {
  const classes = useStyles();

  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [schedulesModalOpen, setSchedulesModalOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

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
    setSchedulesModalOpen(true);
  };

  const handleCloseSchedulesModal = () => {
    setSelectedScheduleId(null);
    setSchedulesModalOpen(false);
  };

  const handleEditSchedule = (schedule) => {
    setSelectedScheduleId(schedule.id);
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
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenSchedulesModal}
          >
            {i18n.t("schedules.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
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
                    {schedule.contact ? `${schedule.contact.name} (${schedule.contact.number})` : ""}
                  </TableCell>
                  <TableCell align="center">{schedule.body}</TableCell>
                  <TableCell align="center">
                    {schedule.sendAt ? format(parseISO(schedule.sendAt), "dd/MM/yyyy HH:mm") : ""}
                  </TableCell>
                  <TableCell align="center">
                    {schedule.sentAt ? (
                      format(parseISO(schedule.sentAt), "dd/MM/yyyy HH:mm")
                    ) : (
                      "Pendiente"
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      disabled={schedule.sentAt !== null}
                      onClick={() => handleEditSchedule(schedule)}
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
              {loading && <TableRowSkeleton columns={5} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Schedules;
