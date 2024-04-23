require ("dotenv").config();
const express = require('express')
const cors = require('cors')
const { MongoClient, ObjectId } = require("mongodb");
const servidor = express();
const bodyParser = require('body-parser'); //permite extraer la información del cuerpo de la petición (para post, put, delete, etc)

servidor.use(cors());
servidor.use(bodyParser.json()); //extrae la información y crea el objeto body en la petición




servidor.use("/prueba",express.static("./index.html"));

function conectar(){
    return MongoClient.connect(process.env.URL_MONGO);
}

servidor.get("/tareas", async (peticion,respuesta) => {

    const conexion = await conectar();

    let coleccion = conexion.db("tareas").collection("tareas")

    let tareas = await coleccion.find().toArray();

    conexion.close();
    
    if (tareas.length === 0) {
        respuesta.json({ message: "No hay tareas" });
    } else {
        respuesta.json(tareas);
    }
    //esto tarda mucho en cargar no se por qué pero me da el console.log

});

servidor.post("/crear-tarea", async (peticion, respuesta) => {
    const conexion = await conectar();
    const nuevaTarea = peticion.body;
    console.log(nuevaTarea);

    let coleccion = conexion.db("tareas").collection("tareas");

    try {
        if (!nuevaTarea.textoTarea || nuevaTarea.textoTarea.trim() === '') {
            respuesta.status(400).send("La tarea tiene que tener un texto");
        } else {
            coleccion.insertOne({ textoTarea: nuevaTarea.textoTarea, editando: false, estado: "pendiente"})
            .then(resultado => {
                conexion.close();
                respuesta.json({ tarea: nuevaTarea});
                console.log("Tarea creada correctamente");
            });
        }
    } catch (error) {
        console.error("Error al crear la tarea:", error);
        respuesta.send("Error interno al crear la tarea");
    }
});

servidor.delete("/tareas/borrar/:id", async (peticion,respuesta) => {

    const conexion = await conectar();
    let coleccion = conexion.db("tareas").collection("tareas")

    let resultado = await coleccion.deleteOne({ _id : new ObjectId(peticion.params.id) });
    console.log(resultado);
    conexion.close();

    if (resultado.deletedCount === 1) {
        respuesta.json({ tareaborrada : "ok"});
    } else {
        respuesta.status(404).send("Error al borrar la tarea");
    }
});

servidor.put("/tareas/editar/:id", async (peticion,respuesta) => {
    
        const conexion = await conectar();
        let coleccion = conexion.db("tareas").collection("tareas")
    
        //editar

        let resultado = await coleccion.updateOne({ _id : new ObjectId(peticion.params.id) }, { $set: { textoTarea: peticion.body.textoTarea } });
        console.log(resultado);
        conexion.close();
    
        if (resultado.modifiedCount === 1) {
            respuesta.status(200).send("Tarea editada correctamente");
        } else {
            respuesta.status(404).send("Error al editar la tarea");
        }
    });

    servidor.put("/tareas/estado/:id", async (peticion, respuesta) => {
        const conexion = await conectar();
        let coleccion = conexion.db("tareas").collection("tareas");
      
        const nuevoEstado = peticion.body.estado;
        const idTarea = new ObjectId(peticion.params.id);
    
        const resultado = await coleccion.updateOne({ _id: idTarea }, { $set: { estado: nuevoEstado } });
        console.log(peticion.body.estado);
        conexion.close();
      
        if (resultado.modifiedCount === 1) {
            respuesta.json({ estadoModificado: true });
        } else {
            respuesta.status(404).send("Error al actualizar el estado de la tarea");
        }
    });

//errores
servidor.use((peticion,respuesta) => { //cualquier cosa que no encaje va a error not found!
    respuesta.status(404);
    respuesta.json({ error : "not found" });
});


servidor.use((error,peticion,respuesta,siguiente) => { //a este middleware se llega cuando se invoca el siguiente con un error
    respuesta.status(400);
    respuesta.json({ error : "petición no válida" });
});

servidor.listen(process.env.PORT)