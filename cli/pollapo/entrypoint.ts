import {
  Command,
  CompletionsCommand,
  HelpCommand,
} from "https://deno.land/x/cliffy@v0.19.1/command/mod.ts";

import add from "./cmds/add.ts";
import install from "./cmds/install.ts";
import login from "./cmds/login.ts";
import remove from "./cmds/remove.ts";
import why from "./cmds/why.ts";

const command = new Command();
command
  .name("pollapo")
  .arguments("<command> [options]")
  .command("add", add)
  .command("completions", new CompletionsCommand())
  .command("help", new HelpCommand().global())
  .command("install", install)
  .command("login", login)
  .command("remove", remove)
  .command("why", why)
  .parse(Deno.args);
