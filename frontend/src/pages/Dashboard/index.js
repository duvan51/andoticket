import React, { useContext, useState, useEffect } from "react";

import { 
  Paper, 
  Container, 
  Grid, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";

import LeadsChart from "./LeadsChart";

const useStyles = makeStyles(theme => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 240,
  },
  customFixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 120,
  },
  customFixedHeightPaperLg: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
  },
  card: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  }
}));

const Dashboard = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({
    leadsByUser: [],
    newLeads: [],
    userTimes: {},
    companyUsers: []
  });

  const [selectedUserId, setSelectedUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (user.profile === "admin") {
      api.get("/dashboard/analytics", {
        params: {
          userId: selectedUserId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      })
        .then((res) => {
          setData(res.data);
        })
        .catch((err) => {
          console.error("Error fetching analytics", err);
        });
    }
  }, [user, selectedUserId, startDate, endDate]);

  if (user.profile !== "admin") {
      return (
          <Container maxWidth="lg" className={classes.container}>
              <Typography component="h2" variant="h6" color="primary" gutterBottom>
                  {i18n.t("dashboard.noAccess")}
              </Typography>
          </Container>
      );
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div>
      <Container maxWidth="lg" className={classes.container}>
        <Grid container spacing={3}>
            {/* Filtros */}
            <Grid item xs={12}>
              <Paper className={classes.card}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <FormControl variant="outlined" margin="dense" fullWidth>
                      <InputLabel>Filtrar por Usuario</InputLabel>
                      <Select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        label="Filtrar por Usuario"
                      >
                        <MenuItem value="">Todos los usuarios</MenuItem>
                        {data.companyUsers?.map((u) => (
                          <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Fecha Inicio"
                      type="date"
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Fecha Fin"
                      type="date"
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  {(selectedUserId || startDate || endDate) && (
                    <Grid item xs={12} sm={3}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        fullWidth
                        onClick={() => {
                          setSelectedUserId("");
                          setStartDate("");
                          setEndDate("");
                        }}
                      >
                        Limpiar Filtros
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Grid>

            {/* Leads Accepted by User */}
            <Grid item xs={12} md={6}>
                <Paper className={classes.card}>
                    <Typography component="h2" variant="h6" color="primary" gutterBottom>
                        Leads Aceptados por Usuario
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Usuario</TableCell>
                                <TableCell>Cantidad</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                             {data.leadsByUser.map((row) => (
                                <TableRow key={row.userId}>
                                    <TableCell>{row.user?.name || row.User?.name || "N/A"}</TableCell>
                                    <TableCell>{row.count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            </Grid>

            {/* Time Online */}
            <Grid item xs={12} md={6}>
                <Paper className={classes.card}>
                    <Typography component="h2" variant="h6" color="primary" gutterBottom>
                        Tiempo en Plataforma
                    </Typography>
                     <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Usuario</TableCell>
                                <TableCell>Tiempo Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(data.userTimes).map(([userId, stats]) => (
                                <TableRow key={userId}>
                                    <TableCell>{stats.name}</TableCell>
                                    <TableCell>{formatTime(stats.seconds)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            </Grid>

           {/* New Leads Chart */}
           <Grid item xs={12}>
                <Paper className={classes.fixedHeightPaper}>
                    <Typography component="h2" variant="h6" color="primary" gutterBottom>
                        Nuevos Leads (Últimos 7 días)
                    </Typography>
                    <LeadsChart data={data.newLeads} />
                </Paper>
           </Grid>

        </Grid>
      </Container>
    </div>
  );
};

export default Dashboard;