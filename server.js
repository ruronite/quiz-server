const express = require("express");
require("dotenv").config();
const pool = require("./db");
const cors = require("cors")
//const insertList = require("./data");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json())
app.use(cors())

/*
app.get("/bulkinsert", async (req, res, next) => {
    console.log("bulking", insertList);
    try {
        let done = 0
        insertList.forEach(async(item) => {
            let response = await pool.query("INSERT INTO questions(question,option_a,option_b,option_c,option_d,answer) VALUES($1,$2,$3,$4,$5,$6)", {
                $1: item[0],
                $2: item[1],
                $3: item[2],
                $4: item[3],
                $5: item[4],
                $6: item[5]
            })
            done += 1
            console.log(done)
        })
        console.log(done)
        return


    } catch (error) {
        console.log(error)

    }

})*/

/*
app.get("/bulkinsert", async (req, res, next) => {
    console.log("bulking", insertList);
    try {
        const done = [];
        
        // Prepare the query and values for bulk insert
        const query = "INSERT INTO questions(question, option_a, option_b, option_c, option_d, answer) VALUES($1, $2, $3, $4, $5, $6)";
        const values = insertList.map(item => [item[0], item[1], item[2], item[3], item[4], item[5]]);
        
        for (const value of values) {
            const response = await pool.query(query, value);
            done.push(response);
        }
        console.log(done.length);

        return res.status(200).json({ message: "Bulk insert successful" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Bulk insert failed" });
    }
});*/



app.get("/questions", async (req, res, next) => {
    try {
        let response = await pool.query("SELECT id, question, option_a, option_b, option_c, option_d FROM questions");
        let all_questions = response.rows;
        console.log("all questions", all_questions);
        let questions = [];
        while (questions.length < 20) {
            console.log("running loop")
            let ind = Math.floor(Math.random() * all_questions.length);
            let pick = all_questions[ind];
            let check = questions.find(question => question.id === pick.id);
            if (!check) {
                questions.push(pick)
            }
        }
        console.log(questions)
        res.status(200).json({ questions: questions });

    } catch (error) {
        res.status(400).json(error)

    }

})

app.get("/results", async (req, res, next) => {
    let response = await pool.query("SELECT * FROM results ORDER BY score DESC");
    console.log(response.rows);
    let results = response.rows;
    res.status(200).json(results);
});

app.get("/result", async (req, res, next) => {
    console.log("query endpoint hit")
    let query = req.query;
    console.log("query received", query)
    console.log(Object.keys(query)[0]);
    let filterBy = Object.keys(query)[0];
    let filterValue = query[filterBy];
    console.log(filterBy, filterValue);
    console.log("type of filter by", typeof filterBy)
    if (filterBy !== "first_name" && filterBy !== "nick_name") {
        console.log("bad request for filter")
        return res.status(400).send();
    }
    try {
        let results = await pool.query("SELECT * FROM results WHERE $1 = $2", [filterBy, filterValue]);
        console.log(results.rows)

    } catch (error) {
        res.status(500).send()
    }
})

app.post("/mark", async (req, res, next) => {
    try {
        console.log("Incoming request", req.body)
        let { firstName, nickName, responses } = req.body;

        console.log(firstName, nickName, responses);

        let question_ids = Object.keys(responses);
        let incorrect = [];
        let score = 0;
        let response = await pool.query("SELECT id, question, answer FROM questions WHERE id = ANY($1)", [question_ids]);
        let answers = response.rows;
        console.log("answers", answers);

        for (let id in responses) {
            console.log("typeof", typeof id)
            let correct = answers.find(answer => answer.id === Number(id));
            console.log("correct", correct)
            if (correct.answer === responses[id]) {
                score += 1;
            }
            else {
                incorrect.push(correct);
            }
        }
        console.log(score);
        console.log("incorrect", incorrect)
        let percent_score = Math.round((score / question_ids.length) * 100);
        console.log("percent", percent_score);

        let newScore = await pool.query("INSERT INTO results (first_name, nick_name, score) VALUES($1, $2, $3) RETURNING *", [firstName, nickName, percent_score]);
        console.log(newScore.rows[0]);

        let feedback = {
            incorrect: incorrect,
            ...newScore.rows[0]
        }

        console.log("feedback", feedback);

        res.status(201).json(feedback);
    }
    catch (err) {
        console.log(err)
        res.status(400).json()
    }


})


app.listen(PORT, () => {
    console.log(`server listening on port: ${PORT}`)
})