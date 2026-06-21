import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { IconButton } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const normalize = (history) => {
      if (!history) return [];
      if (Array.isArray(history)) return history;
      if (typeof history === 'string') {
        try {
          const parsed = JSON.parse(history);
          if (Array.isArray(parsed)) return parsed;
          history = parsed;
        } catch {
          return [];
        }
      }
      if (typeof history === 'object') {
        if (Array.isArray(history.data)) return history.data;
        if (Array.isArray(history.meetings)) return history.meetings;
        if (Array.isArray(history.items)) return history.items;
      }
      return [];
    };

    const fetchHistory = async () => {
      try {
        const raw = await getHistoryOfUser();
        const arr = normalize(raw);
        if (mounted) setMeetings(arr);
      } catch {
        if (mounted) setMeetings([]);
      }
    };

    fetchHistory();
    return () => { mounted = false; };
  }, [getHistoryOfUser]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  return (
    <div>
      <IconButton onClick={() => navigate('/home')}>
        <HomeIcon />
      </IconButton>

      {Array.isArray(meetings) && meetings.length > 0 ? (
        meetings.map((e, i) => (
          <Card key={e.id ?? e.meetingCode ?? i} variant="outlined" sx={{ mb: 1 }}>
            <CardContent>
              <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                Code: {e.meetingCode ?? '—'}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">
                Date: {formatDate(e.date)}
              </Typography>
            </CardContent>
          </Card>
        ))
      ) : (
        <Typography sx={{ mt: 2 }} color="text.secondary">
          No meetings found.
        </Typography>
      )}
    </div>
  );
}
