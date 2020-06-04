'use strict';

module.exports = {
    up: async(queryInterface, Sequelize) => {
        // Añadimos dos grupos, y varias preguntas nuevas.
        // Las preguntas existentes van a la categoría Geography.
        // Las nuevas a Math

        // Add geography group
        let now = new Date();
        await queryInterface.bulkInsert('Groups', [
            {
                name: 'Geography',
                createdAt: now,
                updatedAt: now,
            },
            {
                name: 'Math',
                createdAt: now,
                updatedAt: now,
            },
        ]);

        await queryInterface.bulkInsert('Quizzes', [
            {
                question: '1+1=?',
                answer: '2',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                question: '5^2=?',
                answer: '25',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ])

        const assignments = {
            "Capital of%": "Geography",
            "%=?": "Math"
        };

        for (var query in assignments) {

            const quizzes = (await queryInterface.sequelize.query(
                `SELECT id from Quizzes where question LIKE "${query}";`
            ))[0];

            const course_id = (await queryInterface.sequelize.query(
                `SELECT id from Groups where name='${assignments[query]}';`
            ))[0][0].id;

            for (var q in quizzes) {
                let q_id = quizzes[q].id;

                let query = `INSERT or REPLACE into GroupQuizzes (quizId, groupId, createdAt, updatedAt) values (${q_id}, ${course_id}, "${now.toISOString()}", "${now.toISOString()}");`

                await queryInterface.sequelize.query(query);
            }
        }
    },

    down: async(queryInterface, Sequelize) => {

        // remove extra quizzes
        await queryInterface.bulkDelete('Quizzes', {question: {[Sequelize.Op.like]: '%=?'}}, {});

        await queryInterface.bulkDelete('Groups', null, {});
        return queryInterface.bulkDelete('GroupQuizzes', null, {});
    }
};