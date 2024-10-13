let dice_sizes = [4,6,8,10,12,20,100];

function main(){
    let x = one_dice_size(10, 5);
    console.log(x);
}

/* Outputs Expected Value rolling 'amount' of d'size' times */
function one_dice_size(size, amount){
    let ex_one = (1 + Number(size))/2;
    let res = ex_one * amount;
    return res;
}


function mult_dice_sizes(sizes, amounts){
    let len = sizes.length
}

main();