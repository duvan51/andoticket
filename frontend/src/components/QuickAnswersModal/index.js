import React, { useState, useEffect, useRef, useContext } from "react";

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
  FormControlLabel,
  Checkbox,
  IconButton,
  Typography,
} from "@material-ui/core";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteIcon from "@material-ui/icons/Delete";
import MicIcon from "@material-ui/icons/Mic";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import { green } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import RecordingTimer from "../MessageInput/RecordingTimer";

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
  textQuickAnswerContainer: {
    width: "100%",
    marginTop: 8,
  },
  mediaPreview: {
    display: "flex",
    flexDirection: "column",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  mediaHeader: {
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
}));

const QuickAnswerSchema = Yup.object().shape({
  shortcut: Yup.string()
    .min(2, "Too Short!")
    .max(15, "Too Long!")
    .required("Required"),
  message: Yup.string()
    .max(30000, "Too Long!"),
});

let Mp3Recorder = null;

const initRecorder = async () => {
  if (!Mp3Recorder) {
    try {
      const MicRecorder = (await import("mic-recorder-to-mp3-fixed")).default;
      Mp3Recorder = new MicRecorder({ bitRate: 128 });
    } catch (error) {
      console.error("Failed to initialize recorder:", error);
      return null;
    }
  }
  return Mp3Recorder;
};

const QuickAnswersModal = ({
  open,
  onClose,
  quickAnswerId,
  initialValues,
  onSave,
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);

  const initialState = {
    shortcut: "",
    message: "",
    isGroup: user.profile === "admin",
  };

  const [quickAnswer, setQuickAnswer] = useState(initialState);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchQuickAnswer = async () => {
      setSelectedMedia(null);
      setAudioUrl(null);
      let loadedData = null;

      if (initialValues) {
        loadedData = {
          ...initialValues,
          isGroup: initialValues.userId === null,
        };
        setQuickAnswer((prevState) => {
          return {
            ...prevState,
            ...loadedData,
          };
        });
      }

      if (quickAnswerId) {
        try {
          const { data } = await api.get(`/quickAnswers/${quickAnswerId}`);
          loadedData = {
            ...data,
            isGroup: data.userId === null,
          };
          if (isMounted.current) {
            setQuickAnswer(loadedData);
          }
        } catch (err) {
          toastError(err);
        }
      }

      if (loadedData && loadedData.mediaPath && (loadedData.mediaName?.endsWith(".mp3") || loadedData.mediaName?.endsWith(".ogg") || loadedData.mediaName?.endsWith(".wav"))) {
        try {
          const response = await api.get(`/public/${loadedData.mediaPath}`, { responseType: "blob" });
          if (isMounted.current) {
            const url = URL.createObjectURL(response.data);
            setAudioUrl(url);
          }
        } catch (err) {
          console.error("Failed to load audio preview", err);
        }
      }
    };

    fetchQuickAnswer();
  }, [quickAnswerId, open, initialValues]);

  useEffect(() => {
    if (selectedMedia && selectedMedia.type.startsWith("audio/")) {
      const url = URL.createObjectURL(selectedMedia);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [selectedMedia]);

  const handleStartRecording = async () => {
    try {
      const recorder = await initRecorder();
      if (!recorder) return;

      await navigator.mediaDevices.getUserMedia({ audio: true });
      await recorder.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo iniciar la grabación de audio. Verifique los permisos del micrófono.");
    }
  };

  const handleStopRecording = async () => {
    try {
      const recorder = await initRecorder();
      if (!recorder) return;

      const [, blob] = await recorder.stop().getMp3();
      const filename = `audio-recording-${new Date().getTime()}.mp3`;
      const audioFile = new File([blob], filename, {
        type: "audio/mp3",
      });

      setSelectedMedia(audioFile);
      setRecording(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar la grabación de audio.");
      setRecording(false);
    }
  };

  const handleCancelRecording = async () => {
    try {
      const recorder = await initRecorder();
      if (recorder) {
        await recorder.stop().getMp3();
      }
      setRecording(false);
    } catch (err) {
      console.error(err);
      setRecording(false);
    }
  };

  const handleClose = () => {
    onClose();
    setQuickAnswer(initialState);
    setSelectedMedia(null);
    setAudioUrl(null);
    setRecording(false);
  };

  const handleDeleteMedia = () => {
    setSelectedMedia(null);
    setAudioUrl(null);
    setQuickAnswer((prev) => ({
      ...prev,
      mediaPath: null,
      mediaName: null,
    }));
  };

  const handleSaveQuickAnswer = async (values) => {
    const formData = new FormData();
    formData.append("shortcut", values.shortcut);
    formData.append("message", values.message || "");

    if (!values.isGroup && user?.id) {
      formData.append("userId", user.id);
    }

    if (selectedMedia) {
      formData.append("media", selectedMedia);
    } else if (!quickAnswer.mediaPath) {
      // If media was deleted/cleared
      formData.append("mediaPath", "");
      formData.append("mediaName", "");
    }

    try {
      if (quickAnswerId) {
        await api.put(`/quickAnswers/${quickAnswerId}`, formData);
        handleClose();
      } else {
        const { data: responseData } = await api.post("/quickAnswers", formData);
        if (onSave) {
          onSave(responseData);
        }
        handleClose();
      }
      toast.success(i18n.t("quickAnswersModal.success"));
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
          {quickAnswerId
            ? `${i18n.t("quickAnswersModal.title.edit")}`
            : `${i18n.t("quickAnswersModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={quickAnswer}
          enableReinitialize={true}
          validationSchema={QuickAnswerSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveQuickAnswer(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, errors, touched, isSubmitting }) => (
            <Form>
              <DialogContent dividers>
                <div className={classes.textQuickAnswerContainer}>
                  <Field
                    as={TextField}
                    label={i18n.t("quickAnswersModal.form.shortcut")}
                    name="shortcut"
                    autoFocus
                    error={touched.shortcut && Boolean(errors.shortcut)}
                    helperText={touched.shortcut && errors.shortcut}
                    variant="outlined"
                    margin="dense"
                    className={classes.textField}
                    fullWidth
                  />
                </div>
                <div className={classes.textQuickAnswerContainer}>
                  <Field
                    as={TextField}
                    label={i18n.t("quickAnswersModal.form.message")}
                    name="message"
                    error={touched.message && Boolean(errors.message)}
                    helperText={touched.message && errors.message}
                    variant="outlined"
                    margin="dense"
                    className={classes.textField}
                    multiline
                    rows={4}
                    fullWidth
                  />
                </div>
                <div className={classes.textQuickAnswerContainer}>
                  <input
                    type="file"
                    id="quick-answer-media"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedMedia(e.target.files[0]);
                      }
                    }}
                    disabled={recording}
                  />
                  {!recording ? (
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <label htmlFor="quick-answer-media">
                        <Button
                          variant="outlined"
                          component="span"
                          color="default"
                          startIcon={<AttachFileIcon />}
                          disabled={recording}
                        >
                          Adjuntar Archivo
                        </Button>
                      </label>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<MicIcon />}
                        onClick={handleStartRecording}
                        disabled={recording}
                      >
                        Grabar Audio
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffebee", borderRadius: 4, padding: "4px 8px", width: "fit-content" }}>
                      <RecordingTimer />
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={handleCancelRecording}
                        title="Cancelar grabación"
                      >
                        <HighlightOffIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        style={{ color: "#4caf50" }}
                        onClick={handleStopRecording}
                        title="Guardar grabación"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    </div>
                  )}
                  {(selectedMedia || quickAnswer.mediaName) && (
                    <div className={classes.mediaPreview}>
                      <div className={classes.mediaHeader}>
                        <Typography variant="body2" style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          📎 {selectedMedia ? selectedMedia.name : quickAnswer.mediaName}
                        </Typography>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={handleDeleteMedia}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                      {audioUrl && (
                        <audio
                          src={audioUrl}
                          controls
                          style={{ marginTop: 8, width: "100%", height: 40 }}
                        />
                      )}
                    </div>
                  )}
                </div>
                {user.profile === "admin" && (
                  <div className={classes.textQuickAnswerContainer}>
                    <FormControlLabel
                      control={
                        <Field
                          as={Checkbox}
                          color="primary"
                          name="isGroup"
                          checked={values.isGroup}
                        />
                      }
                      label={i18n.t("quickAnswersModal.form.isGroup")}
                    />
                  </div>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("quickAnswersModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {quickAnswerId
                    ? `${i18n.t("quickAnswersModal.buttons.okEdit")}`
                    : `${i18n.t("quickAnswersModal.buttons.okAdd")}`}
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

export default QuickAnswersModal;
