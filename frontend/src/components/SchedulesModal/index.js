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
} from "@material-ui/core";
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
  container: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "column",
  },
}));

const ScheduleSchema = Yup.object().shape({
  body: Yup.string()
    .min(1, "Too Short!")
    .required("Required"),
  sendAt: Yup.string().required("Required"),
  contactId: Yup.number().required("Required"),
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
  };

  const [schedule, setSchedule] = useState(initialState);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);

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
            sendAt: formatDatetime(new Date(new Date().getTime() + 5 * 60000)),
            contactId: initialValues.contactId || "",
            ticketId: initialValues.ticketId || undefined,
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
            body: found.body,
            sendAt: formatDatetime(found.sendAt),
            contactId: found.contactId,
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
  };

  const handleSaveSchedule = async (values) => {
    try {
      if (scheduleId) {
        await api.put(`/scheduled-messages/${scheduleId}`, values);
      } else {
        await api.post("/scheduled-messages", values);
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
