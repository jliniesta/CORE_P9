const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload el group asociado a :groupId
exports.load = async (req, res, next, groupId) => {

    try {
        const group = await models.Group.findByPk(groupId);
        if (group) {
            req.load = {...req.load, group};
            next();
        } else {
            throw new Error('There is no group with id=' + groupId);
        }
    } catch (error) {
        next(error);
    }
};

// GET /groups
exports.index = async (req, res, next) => {

    try {
        const groups = await models.Group.findAll();
        res.render('groups/index.ejs', { groups });
    } 
    catch (error) {
        next(error);
    }
};

// GET /groups/new
exports.new = (req, res, next) => {

    const group = {name: ""};
    res.render('groups/new', {group});
};

// POST /groups/create
exports.create = async (req, res, next) => {

    const {name} = req.body;

    let group = models.Group.build({name});

    try {
        // Saves only the fields question and answer into the DDBB
        group = await group.save();
        req.flash('success', 'Group created successfully.');
        res.redirect('/groups');
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('groups/new', {group});
        } else {
            req.flash('error', 'Error creating a new Group: ' + error.message);
            next(error);
        }
    }
};

// GET /groups/:groupId/edit
exports.edit = async (req, res, next) => {

    const {group} = req.load;
    const allQuizzes = await models.Quiz.findAll(); //Array de todos los quizzes que hay en la bases de datos
    const groupQuizzesIds = await group.getQuizzes().map(quiz => quiz.id); //Coger los quizzes que son de este grupo
    res.render('groups/edit', {group, allQuizzes, groupQuizzesIds});

};

// PUT /groups/:groupId
exports.update = async (req, res, next) => {

    const {group} = req.load;

    const {name, quizzesIds = []} = req.body;

    group.name = name.trim();

    try {
        await group.save({fields: ["name"]});
        await group.setQuizzes(quizzesIds);
        req.flash('success', 'Group edited successfully.');
        res.redirect('/groups');
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            const allQuizzes = await models.Quiz.findAll();
            res.render('groups/edit', {group, allQuizzes, groupQuizzesIds: quizzesIds}); 
        } else {
            req.flash('error', 'Error editing the Group: ' + error.message);
            next(error);
        }
    }
};

// DELETE /groups/:groupId
exports.destroy = async (req, res, next) => {

    try {
        await req.load.group.destroy();
        req.flash('success', 'Group deleted successfully.');
        res.redirect('/goback');
    } catch (error) {
        req.flash('error', 'Error deleting the Group: ' + error.message);
        next(error);
    }
};

// GET /groups/:groupId/randomplay
exports.randomPlay = async (req, res, next) => {

    const group = req.load.group;

    req.session.groupPlay = req.session.groupPlay || {}; 

    req.session.groupPlay[group.id] = req.session.groupPlay[group.id] || {
        resolved: [], //Si ya existe esta propiedad no hace nada, y si no la asigno a un array vacio
        lastQuizId: 0
    };


    try{
        let quiz;

        if (req.session.groupPlay[group.id].lastQuizId){

            quiz = await models.Quiz.findByPk(req.session.groupPlay[group.id].lastQuizId);
    
        } else {
    
            const total = await group.countQuizzes(); //Cuento los quizzes que hay
            const quedan = total - req.session.groupPlay[group.id].resolved.length;
            
            quiz = await models.Quiz.findOne({
                where: {'id': {[Sequelize.Op.notIn]: req.session.groupPlay[group.id].resolved}}, //Saco un quiz al azar
                include: [
                    {
                        model: models.Group,
                        as: "groups",
                        where: {id: group.id}
                    }
                ],
                offset: Math.floor(Math.random() * quedan)
            });
    
        }
    
        const score = req.session.groupPlay[group.id].resolved.length; //Calculo los puntos
    
        if (quiz){
            req.session.groupPlay[group.id].lastQuizId = quiz.id;
            res.render("groups/random_play", {group, quiz, score}) //Visualizo la pregunta que sea
        } else{
            delete req.session.groupPlay[group.id];
            res.render("groups/random_nomore", {group, score}) //Visualizo la pagina indicando que no me queda nada mas
        }

    }
    catch (error){
        next(error);
    }
};

//GET /groups/:groupId/randomcheck/:quizId
exports.randomCheck = async (req, res, next) => {

    const group = req.load.group;

    req.session.groupPlay = req.session.groupPlay || {}; 

    req.session.groupPlay[group.id] = req.session.groupPlay[group.id] || {
        resolved: [], //Si ya existe esta propiedad no hace nada, y si no la asigno a un array vacio
        lastQuizId: 0
    };

    const answer = req.query.answer || "";

    const result = (answer.toLowerCase().trim() === req.load.quiz.answer.toLowerCase().trim()); //Lo pasamos a minusculas y le quitamos los espacios

    if (result){

        req.session.groupPlay[group.id].lastQuizId = 0;

        if(req.session.groupPlay[group.id].resolved.indexOf(req.load.quiz.id)== -1){
            req.session.groupPlay[group.id].resolved.push(req.load.quiz.id);
        }

        const score = req.session.groupPlay[group.id].resolved.length; //Calculo los puntos

        res.render("groups/random_result", {group, result, answer, score});

    }
    else{

        const score = req.session.groupPlay[group.id].resolved.length; //Calculo los puntos

        delete req.session.groupPlay[group.id];

        res.render("groups/random_result", {group, result, answer, score});

    }

};