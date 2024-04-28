require ("dotenv").config();
const express = require('express')
const cors = require('cors')
const { MongoClient, ObjectId } = require("mongodb");
const servidor = express();
const bodyParser = require('body-parser'); //permite extraer la información del cuerpo de la petición (para post, put, delete, etc)

servidor.use(cors()); //si no usamos esto no podemos hacer peticiones desde el front, porque no permite que se hagan peticiones desde otros dominios
servidor.use(bodyParser.json()); //extrae la información y crea el objeto body en la petición

/*servidor.use("/prueba",express.static("./index.html")); */ //esto es para hacer pruebas de la api de forma sencilla (comprobar peticiones post, delete, etc)

function conectar(){ //conectar a la base de datos. Lo ponemos en una función para invocarla y no tener que reescribir el código
    return MongoClient.connect(process.env.URL_MONGO); //usamos process.env para ocultar la url de la bd
}

servidor.get("/tareas", async (peticion,respuesta) => {
    const conexion = await conectar();

    let coleccion = conexion.db("tareas").collection("tareas")

    let tareas = await coleccion.find().toArray();

    console.log(tareas)
    respuesta.json(tareas);
    conexion.close();
    
    //En un principio esto me tardaba mucho en cargar pero me daba el console.log. Creo que era problema de la bd. También me dio problemas a la hora de subirlo a render porque no me cargaba las tareas (no había puesto que la bd pudiera recibir peticiones desde cualquier ip)

});

servidor.post("/crear-tarea", async (peticion, respuesta) => {
    const conexion = await conectar();
    const nuevaTarea = peticion.body; //recojo la tarea y la meto en una constante para poder trabajar con ella

    let coleccion = conexion.db("tareas").collection("tareas");

    try {
        if (!nuevaTarea.textoTarea || nuevaTarea.textoTarea.trim() === '') {
            respuesta.send("La tarea tiene que tener un texto"); //si no hay texto en la tarea, devuelvo un error
        } else {
            coleccion.insertOne({ textoTarea: nuevaTarea.textoTarea, editando: false, estado: "pendiente"}) //inserto la tarea en la bd
            .then(resultado => {
              conexion.close();
              respuesta.json({ tarea: nuevaTarea }); //devuelvo la tarea creada en formato json
              console.log("Tarea creada correctamente");
            });
        }
    } catch (error) {
        console.error("Error al crear la tarea:");
        respuesta.send("Error interno al crear la tarea");
    }
});

servidor.delete("/tareas/borrar/:id", async (peticion,respuesta) => {

    const conexion = await conectar();
    let coleccion = conexion.db("tareas").collection("tareas")

    let resultado = await coleccion.deleteOne({ _id : new ObjectId(peticion.params.id) }); //borro la tarea con el id que me llega en la petición
    console.log(resultado);
    conexion.close();

    if (resultado.deletedCount === 1) { //si se ha borrado una tarea, devuelvo un mensaje de confirmación que luego podremos manipular en el front
        respuesta.json({ tareaborrada : "ok"});
    } else {
        respuesta.status(404).send("Error al borrar la tarea"); //si no se ha borrado, devuelvo un error
    }
});

servidor.put("/tareas/editar/:id", async (peticion,respuesta) => {
    
        const conexion = await conectar();
        let coleccion = conexion.db("tareas").collection("tareas")
    
        //editar el texto de la tarea

        let resultado = await coleccion.updateOne({ _id : new ObjectId(peticion.params.id) }, { $set: { textoTarea: peticion.body.textoTarea } });
        console.log(resultado);
        conexion.close();
    
        if (resultado.modifiedCount === 1) {
            respuesta.status(200).send("Tarea editada correctamente"); //si se ha editado la tarea, devuelvo un mensaje de confirmación. Lo manipularemos en el front con el status
        } else {
            respuesta.status(404).send("Error al editar la tarea"); //si no se ha editado, es decir, el texto de la tarea está igual, devuelvo un error
        }
    });

    servidor.put("/tareas/estado/:id", async (peticion, respuesta) => {
        const conexion = await conectar();
        let coleccion = conexion.db("tareas").collection("tareas");
      
        const nuevoEstado = peticion.body.estado;
        const idTarea = new ObjectId(peticion.params.id);
    
        const resultado = await coleccion.updateOne({ _id: idTarea }, { $set: { estado: nuevoEstado } }); //guardo el id de la tarea y el nuevo estado en una constante
        console.log(peticion.body.estado); //compruebo que el estado se cambia correctamente
        conexion.close();
      
        if (resultado.modifiedCount === 1) {
            respuesta.json({ estadoModificado: true }); //si se ha modificado el estado de la tarea, devuelvo un json con estadoModificado a true
        } else {
            respuesta.status(404).send("Error al actualizar el estado de la tarea"); //si no se ha modificado, devuelvo un error
        }
    });

//errores
servidor.use((peticion,respuesta) => { //cualquier petición que no encaje va a error not found
    respuesta.status(404);
    respuesta.json({ error : "not found" });
});


servidor.use((error,peticion,respuesta,siguiente) => { //a este middleware se llega cuando se invoca siguiente con un error
    respuesta.status(400);
    respuesta.json({ error : "petición no válida" });
});

servidor.listen(process.env.PORT || 4000) 