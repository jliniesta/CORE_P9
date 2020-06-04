
const {Model} = require('sequelize');

// Definition of the Group model:

module.exports = (sequelize, DataTypes) => {

    class Group extends Model {}

    Group.init({
            name: {
                type: DataTypes.STRING,
                unique: true,
                validate: {notEmpty: {msg: "Name must not be empty"}}
            },
        }, {
            sequelize
        }
    );

    return Group;
};
