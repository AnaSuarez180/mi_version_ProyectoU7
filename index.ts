import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';


dotenv.config();

const prisma = new PrismaClient();

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());

//Home de prueba
app.get('/home', (req: Request, res: Response) => {
    res.send('Holaa! Considera esto un éxito! Welcome home')
});

//Ruta Display de Users
app.get('/users', async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            last_session: true,
            created_at: true,
            date_born: true
        }
    });
    res.json(users);
});

//Espacio para crear Users
app.post('/new_user', async (req: Request, res: Response) => {
    const user = req.body as { name: string, email: string, password: string, date_born: string};
    const password = user.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
        data: {
            name: user.name,
            email: user.email,
            password: hashedPassword,
            last_session: new Date(),
            created_at: new Date(),
            date_born: new Date(user.date_born)
        }
    });

    res.json(newUser);
});
//Fin del espacio

//Espacio para Login
app.post('/login', async (req: Request, res: Response) => {
    const user = req.body as { email: string, password: string};
    const email = user.email;
    const password = user.password;

    const existingUser = await prisma.user.findUnique({
        where: {
            email: email
        }
    });

    if(!existingUser) {
        return res.status(404).json({error: 'Usuario no encontrado.'});
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if(!isMatch) {
        return res.status(401).json({error: 'Contraseña incorrecta'});
    }

    const token = jwt.sign({id: existingUser.id}, 'secretKey');

    res.json({token});
});
//Fin del espacio

//Ruta Display de Songs
app.get('/songs',async (req: Request, res: Response) => {
    const songs = await prisma.song.findMany();
    res.json(songs);
});

//Ruta Display Songs by id
app.get('/songs/:id', async (req: Request, res: Response) => {
    const song = await prisma.song.findUnique({
        where: {
            id: parseInt(req.params.id)
        }
    });
    if (song) {
        res.json(song);
    } else {
        res.status(404).send("Canción no encontrada");
    }
});

//Fin del espacio

//Espacio para el post de Songs
app.post('/new_song', async (req: Request, res: Response) => {
    const song = req.body as { 
        name: string, artist: string, album: string, year: number, genre: string, duration: number};

    const newSong = await prisma.song.create({
        data: {
            name: song.name,
            artist: song.artist,
            album: song.album,
            year: song.year,
            genre: song.genre,
            duration: song.duration,
            playlists: {}
            }
        });
        
        res.json(newSong);
});
//Fin del espacio

//Ruta Display de Playlists
app.get('/playlists',async (req: Request, res: Response) => {
    const playlists = await prisma.playlist.findMany({
        select: {
            id: true,
            name: true,
            user_id: true,
            songs: true
        }
    });
    res.json(playlists);
});

//Espacio para el post de Playlists
app.post('/new_playlist', async (req: Request, res: Response) => {
    const playlist = req.body as { 
        name: string, user_id: number, song?: Array<number>};
    const newPlaylist = await prisma.playlist.create({
        data: {
            name:playlist.name,
            user_id:playlist.user_id,
            songs: {
                connect: playlist.song ? playlist.song.map(id => ({ id })) : undefined
            }
        }
    });
    res.json(newPlaylist);
});
//Fin del espacio

//Espacio para añadir una canción a una playlist
app.put('/playlists/add-song', async (req: Request, res: Response) => {
    const { id_song, id_playlist } = req.body;
    let data = {};
    if (id_song) {
        data = {
            songs: {
                connect: { id: id_song }
            }
        }
    }
    const updatedPlaylist = await prisma.playlist.update({
        where: { id: id_playlist },
        data
    });
    res.json(updatedPlaylist);
});

//Fin del espacio

app.listen(port, () => {
    console.log(`Puerto ${port}`);
});