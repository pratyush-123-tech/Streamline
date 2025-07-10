import * as React from 'react';
import {
  Avatar,
  Button,
  CssBaseline,
  TextField,
  FormControlLabel,
  Checkbox,
  Link,
  Grid,
  Box,
  Typography,
  Paper
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Snackbar from '@mui/material/Snackbar';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
 
const defaultTheme = createTheme();

export default function Authenticate() {
    const [username,setUsername]=React.useState();
    const [password,setPassword]=React.useState();
    const [error,setError]=React.useState("");
    const [formState,setFormState]=React.useState(0);
    const [messages,setMessages]=React.useState();
    const [open,setOpen]=React.useState();
    const {handleLogin,handleRegister}=React.useContext(AuthContext);
    const handleAuth=async ()=>{
        try{
            if(formState===0){
                let result =await handleLogin(username,password);
                
                setMessages("User logged in");
            }
            if(formState===1){
                console.log("hellp");
                let result=await handleRegister(username,password);
                console.log(result);
                setMessages(result);
                setOpen(true);
                setFormState(0);
                setPassword("");
                setError("");
                setUsername("");
                
            }
        }
        catch(err){
            console.log(err);
            let message = err?.response?.data?.message || "Something went wrong";
            setError(message);
        }
         
    }
  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid
        container
        component="main"
        sx={{
          height: '100vh',
          width: '100vw',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CssBaseline />
        <Grid
          item
          xs={11}
          sm={8}
          md={5}
          component={Paper}
          elevation={6}
          square
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <div>
            <Button variant={formState===0 ?"contained":""} onClick={()=>setFormState(0)}>Sign in</Button>
            <Button variant={formState===1 ?"contained":""} onClick={()=>setFormState(1)}>Sign up</Button>
          </div>
          {/* <Typography component="h1" variant="h5">
            Sign in
          </Typography> */}
          <Box component="form" noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoFocus
              onChange={(e)=>setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              onChange={(e)=>setPassword(e.target.value)}
                        
            />
            <p style={{color:"red"}}>{error}</p>
            <Button
              type="button"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleAuth}
            >
              {formState==0?"Sign in":"Sign up"}
            </Button>
             
          </Box>
        </Grid>
      </Grid>
      <Snackbar
        open={open}
        autoHideDuration={4000}
         
        message={messages}
         
    />
    </ThemeProvider>
     
  );
}
