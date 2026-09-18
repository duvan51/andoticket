import React, { useState, useEffect } from "react";
import { FormControl, Select, MenuItem, Chip } from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const QueueSelectTicket = ({ ticket, onChange }) => {
  const [queues, setQueues] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState(ticket?.queueId || ticket?.queue?.id || "");

  useEffect(() => {
    setSelectedQueueId(ticket?.queueId || ticket?.queue?.id || "");
  }, [ticket]);

  useEffect(() => {
    const fetchQueues = async () => {
      try {
        const { data } = await api.get("/queue");
        setQueues(data);
      } catch (err) {
        toastError(err);
      }
    };
    fetchQueues();
  }, []);

  const handleChange = async (e) => {
    const newQueueId = e.target.value;
    setSelectedQueueId(newQueueId);
    try {
      await api.put(`/tickets/${ticket.id}`, {
        queueId: newQueueId === "" ? null : newQueueId,
      });
      toast.success("Departamento actualizado correctamente");
      if (onChange) onChange(newQueueId);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <FormControl fullWidth size="small" variant="outlined" style={{ marginTop: 6, marginBottom: 10 }}>
      <Select
        value={selectedQueueId || ""}
        onChange={handleChange}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) return <span style={{ color: "#888" }}>Sin Departamento</span>;
          const q = queues.find((item) => item.id === selected);
          if (!q) return <span style={{ color: "#888" }}>Sin Departamento</span>;
          return (
            <Chip
              size="small"
              style={{ backgroundColor: q.color || "#2576d2", color: "#fff", fontWeight: "bold" }}
              label={q.name}
            />
          );
        }}
      >
        <MenuItem value="">
          <em>Sin Departamento</em>
        </MenuItem>
        {queues.map((queue) => (
          <MenuItem key={queue.id} value={queue.id}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: queue.color || "#2576d2",
                display: "inline-block",
                marginRight: 8,
              }}
            />
            {queue.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default QueueSelectTicket;
