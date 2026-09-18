import React, { useState, useEffect, useRef } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  makeStyles,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Typography,
} from "@material-ui/core";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteIcon from "@material-ui/icons/Delete";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { green } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    width: "100%",
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  checkboxLabel: {
    fontSize: "0.8rem",
  },
  container: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "column",
  },
}));

const ScheduleSchema = Yup.object().shape({
  body: Yup.string(),
  sendAt: Yup.string().required("Required"),
  contactId: Yup.number().required("Required"),
  mediaType: Yup.string().required("Required"),
  sendConfirmation: Yup.boolean(),
  schedule24hReminder: Yup.boolean(),
  scheduleSameDayReminder: Yup.boolean(),
});

const formatDatetime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const tzoffset = d.getTimezoneOffset() * 60000;
  const localISOTime = new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
  return localISOTime;
};

const SchedulesModal = ({ open, onClose, scheduleId, onSave, initialValues }) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const initialState = {
    body: "",
    sendAt: formatDatetime(new Date(new Date().getTime() + 5 * 60000)), // 5 mins in future by default
    contactId: "",
    mediaType: "message",
    sendConfirmation: true,
    schedule24hReminder: true,
    scheduleSameDayReminder: true,
  };

  const [schedule, setSchedule] = useState(initialState);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    
    const fetchSchedule = async () => {
      if (!scheduleId) {
        if (initialValues) {
          setSchedule({
            body: initialValues.body || "",
            sendAt: initialValues.sendAt ? formatDatetime(initialValues.sendAt) : formatDatetime(new Date(new Date().getTime() + 5 * 60000)),
            contactId: initialValues.contactId || "",
            ticketId: initialValues.ticketId || undefined,
            mediaType: initialValues.mediaType || "message",
            sendConfirmation: true,
            schedule24hReminder: true,
            scheduleSameDayReminder: true,
          });
          if (initialValues.contact) {
            setSelectedContact(initialValues.contact);
            setOptions([initialValues.contact]);
          }
        } else {
          setSchedule(initialState);
          setSelectedContact(null);
        }
        return;
      }

      try {
        const { data } = await api.get(`/scheduled-messages`);
        const found = data.find((s) => s.id === scheduleId);
        if (found && isMounted.current) {
          setSchedule({
            body: found.body || "",
            sendAt: formatDatetime(found.sendAt),
            contactId: found.contactId,
            mediaType: found.mediaType || "message",
            mediaUrl: found.mediaUrl || null,
            mediaName: found.mediaName || null,
          });
          if (found.contact) {
            setSelectedContact(found.contact);
            setOptions([found.contact]);
          }
        }
      } catch (err) {
        toastError(err);
      }
    };

    fetchSchedule();
  }, [scheduleId, open]);

  useEffect(() => {
    if (!open || searchParam.length < 3) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("contacts", {
            params: { searchParam },
          });
          if (isMounted.current) {
            setOptions(data.contacts);
          }
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };

      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, open]);

  const handleClose = () => {
    onClose();
    setSchedule(initialState);
    setSelectedContact(null);
    setSearchParam("");
    setOptions([]);
    setSelectedMedia(null);
  };

  const handleDeleteMedia = () => {
    setSelectedMedia(null);
    setSchedule((prev) => ({
      ...prev,
      mediaUrl: null,
      mediaName: null,
    }));
  };

  const handleSaveSchedule = async (values) => {
    const formData = new FormData();
    formData.append("body", values.body || "");
    formData.append("sendAt", values.sendAt);
    formData.append("contactId", values.contactId);
    formData.append("mediaType", values.mediaType);
    if (values.ticketId) {
      formData.append("ticketId", values.ticketId);
    }
    if (values.sendConfirmation !== undefined) {
      formData.append("sendConfirmation", values.sendConfirmation);
    }
    if (values.schedule24hReminder !== undefined) {
      formData.append("schedule24hReminder", values.schedule24hReminder);
    }
    if (values.scheduleSameDayReminder !== undefined) {
      formData.append("scheduleSameDayReminder", values.scheduleSameDayReminder);
    }

    if (selectedMedia) {
      formData.append("media", selectedMedia);
    } else if (schedule.mediaUrl) {
      formData.append("mediaUrl", schedule.mediaUrl);
      formData.append("mediaName", schedule.mediaName);
    } else {
      formData.append("mediaUrl", "");
      formData.append("mediaName", "");
    }

    try {
      if (scheduleId) {
        await api.put(`/scheduled-messages/${scheduleId}`, formData);
      } else {
        await api.post("/scheduled-messages", formData);
      }
      toast.success(i18n.t("schedulesModal.success"));
      if (onSave) {
        onSave();
      }
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {scheduleId
            ? `${i18n.t("schedulesModal.title.edit")}`
            : `${i18n.t("schedulesModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={schedule}
          enableReinitialize={true}
          validationSchema={ScheduleSchema}
          onSubmit={(values, actions) => {
            if (!values.body && !selectedMedia && !schedule.mediaUrl) {
              toast.error("Debe ingresar un mensaje o adjuntar un archivo");
              actions.setSubmitting(false);
              return;
            }
            setTimeout(() => {
              handleSaveSchedule(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <DialogContent dividers>
                <div className={classes.container}>
                  <Autocomplete
                    options={options}
                    loading={loading}
                    clearOnBlur
                    autoHighlight
                    clearOnEscape
                    getOptionLabel={(option) => option.name || ""}
                    renderOption={(option) => `${option.name} - ${option.number}`}
                    value={selectedContact}
                    onChange={(e, newValue) => {
                      setSelectedContact(newValue);
                      setFieldValue("contactId", newValue ? newValue.id : "");
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={i18n.t("schedulesModal.form.contact")}
                        variant="outlined"
                        margin="dense"
                        onChange={(e) => setSearchParam(e.target.value)}
                        error={touched.contactId && Boolean(errors.contactId)}
                        helperText={touched.contactId && errors.contactId}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {loading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                  />

                  <FormControl variant="outlined" margin="dense" fullWidth>
                    <InputLabel id="mediaType-label">Tipo de Agendamiento</InputLabel>
                    <Field
                      as={Select}
                      labelId="mediaType-label"
                      label="Tipo de Agendamiento"
                      name="mediaType"
                      onChange={(e) => setFieldValue("mediaType", e.target.value)}
                    >
                      <MenuItem value="message">Mensaje de WhatsApp</MenuItem>
                      <MenuItem value="appointment">Cita / Reunión</MenuItem>
                    </Field>
                  </FormControl>

                  {values.mediaType === "appointment" && (
                    <div style={{ marginTop: 4, marginBottom: 8, display: "flex", flexDirection: "column", gap: "2px" }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={values.sendConfirmation}
                            onChange={(e) => setFieldValue("sendConfirmation", e.target.checked)}
                            color="primary"
                            size="small"
                          />
                        }
                        label="Enviar confirmación inmediata por WhatsApp"
                        style={{ color: "gray" }}
                        classes={{ label: classes.checkboxLabel }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={values.schedule24hReminder}
                            onChange={(e) => setFieldValue("schedule24hReminder", e.target.checked)}
                            color="primary"
                            size="small"
                          />
                        }
                        label="Programar recordatorio automático 24h antes"
                        style={{ color: "gray" }}
                        classes={{ label: classes.checkboxLabel }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={values.scheduleSameDayReminder}
                            onChange={(e) => setFieldValue("scheduleSameDayReminder", e.target.checked)}
                            color="primary"
                            size="small"
                          />
                        }
                        label="Programar recordatorio automático el mismo día (2h antes)"
                        style={{ color: "gray" }}
                        classes={{ label: classes.checkboxLabel }}
                      />
                    </div>
                  )}

                  <Field
                    as={TextField}
                    label={i18n.t("schedulesModal.form.sendAt")}
                    name="sendAt"
                    type="datetime-local"
                    variant="outlined"
                    margin="dense"
                    className={classes.textField}
                    error={touched.sendAt && Boolean(errors.sendAt)}
                    helperText={touched.sendAt && errors.sendAt}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    fullWidth
                  />

                  <Field
                    as={TextField}
                    label={i18n.t("schedulesModal.form.body")}
                    name="body"
                    error={touched.body && Boolean(errors.body)}
                    helperText={touched.body && errors.body}
                    variant="outlined"
                    margin="dense"
                    className={classes.textField}
                    multiline
                    rows={5}
                    fullWidth
                  />

                  <input
                    type="file"
                    id="schedule-media"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedMedia(e.target.files[0]);
                      }
                    }}
                  />
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: 8, marginBottom: 8 }}>
                    <label htmlFor="schedule-media">
                      <Button
                        variant="outlined"
                        component="span"
                        color="default"
                        startIcon={<AttachFileIcon />}
                      >
                        Adjuntar Archivo
                      </Button>
                    </label>
                  </div>
                  {(selectedMedia || schedule.mediaName) && (
                    <div style={{ display: "flex", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 4, padding: "8px", margin: "8px 0" }}>
                      <Typography variant="body2" style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        📎 {selectedMedia ? selectedMedia.name : schedule.mediaName}
                      </Typography>
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={handleDeleteMedia}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  )}
                </div>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("schedulesModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {scheduleId
                    ? `${i18n.t("schedulesModal.buttons.okEdit")}`
                    : `${i18n.t("schedulesModal.buttons.okAdd")}`}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default SchedulesModal;
