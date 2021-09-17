const ast = require("./examples/inst.rs_parsed.json");


const Instruction = "solana_program::instruction::Instruction";
const ProgramError = "solana_program::program_error::ProgramError";
const AccountMeta = "solana_program::instruction::AccountMeta";
const Pubkey = "solana_program::pubkey::Pubkey";

function parseAST(ast) {
  const useTypes = new Set();

  function walk(obj, ref = []) {
    if (obj.ident) {
      ref.push(obj.ident.to_string);
    }

    if (obj.items) {
      for (let key in obj.items) {
        const newAd = [].concat(ref);
        walk(obj.items[key], newAd);
      }
      return;
    }

    if (obj.tree) {
      walk(obj.tree, ref);
      return;
    }

    if (ref.length > 1) {
        const libUsed = ref.join("::");
        useTypes.add(libUsed);
        // console.log(ref.join("::"));
    }
  }

  ast.items.forEach((item) => {
    if (item._type == "ItemUse") {
      // console.log(item.tree.ident.to_string);
      walk(item.tree);
    }
  });


  const hasInstruction = useTypes.has(Instruction);
  const hasAccountMeta = useTypes.has(AccountMeta);
  const hasProgramError = useTypes.has(ProgramError);
//   const hasAccountMeta = useTypes.has(AccountMeta);


  console.log({
    hasInstruction,
    hasAccountMeta,
    hasProgramError,
  });

}

parseAST(ast);
